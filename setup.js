const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Command line arguments parsing
function parseArguments() {
  const args = process.argv.slice(2);
  const params = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project-name' && args[i + 1]) {
      params.projectName = args[i + 1];
      i++; // Skip next argument as it's the value
    } else if (args[i] === '--bundle-name' && args[i + 1]) {
      params.bundleName = args[i + 1];
      i++; // Skip next argument as it's the value
    }
  }
  
  return params;
}

// Function to detect current iOS project name
function detectCurrentIOSProjectName() {
  const iosPath = './ios';
  if (!fs.existsSync(iosPath)) return null;
  const entries = fs.readdirSync(iosPath);
  // Look for .xcodeproj folder
  const xcodeproj = entries.find(e => e.endsWith('.xcodeproj'));
  if (xcodeproj) {
    return xcodeproj.replace('.xcodeproj', '');
  }
  // Fallback: look for main folder with AppDelegate.swift
  for (const entry of entries) {
    const appDelegatePath = path.join(iosPath, entry, 'AppDelegate.swift');
    if (fs.existsSync(appDelegatePath)) {
      return entry;
    }
  }
  return null;
}

// Function to rename iOS folders and update config files
function renameIOSFoldersAndConfigs(newProjectName) {
  const iosPath = './ios';
  const oldProjectName = detectCurrentIOSProjectName();
  if (!oldProjectName) {
    console.log('⚠️  Could not detect current iOS project name. Skipping renaming...');
    return;
  }

  if (!fs.existsSync(iosPath)) {
    console.log('⚠️  iOS folder not found, skipping iOS folder renaming...');
    return;
  }

  try {
    console.log(`📁 Renaming iOS project folders from "${oldProjectName}" to "${newProjectName}"...`);

    // Rename the main iOS project folder
    const oldFolderPath = path.join(iosPath, oldProjectName);
    const newFolderPath = path.join(iosPath, newProjectName);
    if (fs.existsSync(oldFolderPath)) {
      fs.renameSync(oldFolderPath, newFolderPath);
      console.log(`   ✅ Renamed ${oldProjectName} folder to ${newProjectName}`);
    }

    // Rename the .xcodeproj folder
    const oldXcodeProjPath = path.join(iosPath, `${oldProjectName}.xcodeproj`);
    const newXcodeProjPath = path.join(iosPath, `${newProjectName}.xcodeproj`);
    if (fs.existsSync(oldXcodeProjPath)) {
      fs.renameSync(oldXcodeProjPath, newXcodeProjPath);
      console.log(`   ✅ Renamed ${oldProjectName}.xcodeproj to ${newProjectName}.xcodeproj`);
    }

    // Rename the .xcworkspace folder if it exists
    const oldWorkspacePath = path.join(iosPath, `${oldProjectName}.xcworkspace`);
    const newWorkspacePath = path.join(iosPath, `${newProjectName}.xcworkspace`);
    if (fs.existsSync(oldWorkspacePath)) {
      fs.renameSync(oldWorkspacePath, newWorkspacePath);
      console.log(`   ✅ Renamed ${oldProjectName}.xcworkspace to ${newProjectName}.xcworkspace`);
    }

    console.log('📝 Updating iOS configuration files...');

    // Update all references in iOS config files
    const exts = ['.swift', '.plist', '.storyboard', '.xcscheme', '.pbxproj'];
    function updateReferencesInFile(filePath) {
      let content = fs.readFileSync(filePath, 'utf8');
      const updated = content.replace(new RegExp(oldProjectName, 'g'), newProjectName);
      if (updated !== content) {
        fs.writeFileSync(filePath, updated, 'utf8');
        console.log(`   ✅ Updated references in ${filePath}`);
      }
    }
    function walkDir(dir) {
      fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          walkDir(fullPath);
        } else if (exts.some(ext => file.endsWith(ext))) {
          updateReferencesInFile(fullPath);
        }
      });
    }
    walkDir(iosPath);

    // Rename and update .xcscheme file
    const oldSchemePath = path.join(iosPath, `${newProjectName}.xcodeproj`, 'xcshareddata', 'xcschemes', `${oldProjectName}.xcscheme`);
    const newSchemePath = path.join(iosPath, `${newProjectName}.xcodeproj`, 'xcshareddata', 'xcschemes', `${newProjectName}.xcscheme`);
    if (fs.existsSync(oldSchemePath)) {
      let schemeContent = fs.readFileSync(oldSchemePath, 'utf8');
      schemeContent = schemeContent.replace(new RegExp(oldProjectName, 'g'), newProjectName);
      fs.writeFileSync(newSchemePath, schemeContent, 'utf8');
      fs.unlinkSync(oldSchemePath);
      console.log(`   ✅ Renamed and updated ${oldProjectName}.xcscheme to ${newProjectName}.xcscheme`);
    }

    // Update all occurrences of old project name in Podfile
    const podfilePath = path.join(iosPath, 'Podfile');
    if (fs.existsSync(podfilePath)) {
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');
      const oldNameRegex = new RegExp(oldProjectName, 'g');
      if (oldNameRegex.test(podfileContent)) {
        podfileContent = podfileContent.replace(oldNameRegex, newProjectName);
        fs.writeFileSync(podfilePath, podfileContent, 'utf8');
        console.log(`   ✅ Updated all Podfile references to '${newProjectName}'`);
      }
    }

    console.log('✅ iOS folders and configuration files updated successfully!');
  } catch (error) {
    console.error('❌ Error renaming iOS folders:', error.message);
    throw error;
  }
}

// Function to update package.json name
function updatePackageJsonName(newProjectName) {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(pkgPath)) {
    let pkgContent = fs.readFileSync(pkgPath, 'utf8');
    const pkgJson = JSON.parse(pkgContent);
    if (pkgJson.name !== newProjectName) {
      pkgJson.name = newProjectName;
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2), 'utf8');
      console.log(`   ✅ Updated package.json name to "${newProjectName}"`);
    }
  }
}

// Function to update app.json name
function updateAppJsonName(newProjectName) {
  const appJsonPath = path.join(process.cwd(), 'app.json');
  if (fs.existsSync(appJsonPath)) {
    let appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
    const appJson = JSON.parse(appJsonContent);
    if (appJson.name !== newProjectName || appJson.displayName !== newProjectName) {
      appJson.name = newProjectName;
      appJson.displayName = newProjectName;
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
      console.log(`   ✅ Updated app.json name to "${newProjectName}"`);
    }
  }
}

const { projectName, bundleName } = parseArguments();

console.log('⚡ React Native Flash Boilerplate Setup ⚡');
console.log('=======================================');

try {
  // Rename project if project name and bundle name are provided
  if (projectName && bundleName) {
    console.log(`🏷️  Renaming project to "${projectName}" with bundle "${bundleName}"...`);
    // Directly rename iOS folders and update config files
    renameIOSFoldersAndConfigs(projectName);
    // Update package.json name
    updatePackageJsonName(projectName);
    // Update app.json name
    updateAppJsonName(projectName);
    // Optionally, update bundle identifier in Info.plist
    const infoPlistPath = path.join('./ios', projectName, 'Info.plist');
    if (fs.existsSync(infoPlistPath)) {
      let infoPlistContent = fs.readFileSync(infoPlistPath, 'utf8');
      infoPlistContent = infoPlistContent.replace(/com\.\w+\.\w+/g, bundleName);
      fs.writeFileSync(infoPlistPath, infoPlistContent, 'utf8');
      console.log(`   ✅ Updated Info.plist bundle identifier to "${bundleName}"`);
    }

    // Delete Podfile.lock, Pods directory, and vendor/bundle for a clean install
    const podfileLockPath = path.join('./ios', 'Podfile.lock');
    const podsDirPath = path.join('./ios', 'Pods');
    const vendorBundlePath = path.join('./vendor/bundle');
    
    // Recursively delete directory helper function
    function deleteFolderRecursive(folderPath) {
      if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
          const curPath = path.join(folderPath, file);
          if (fs.lstatSync(curPath).isDirectory()) {
            deleteFolderRecursive(curPath);
          } else {
            fs.unlinkSync(curPath);
          }
        });
        fs.rmdirSync(folderPath);
      }
    }
    
    if (fs.existsSync(podfileLockPath)) {
      fs.unlinkSync(podfileLockPath);
      console.log('   ✅ Deleted ios/Podfile.lock');
    }
    if (fs.existsSync(podsDirPath)) {
      deleteFolderRecursive(podsDirPath);
      console.log('   ✅ Deleted ios/Pods directory');
    }
    if (fs.existsSync(vendorBundlePath)) {
      deleteFolderRecursive(vendorBundlePath);
      console.log('   ✅ Deleted vendor/bundle directory');
    }
  } else if (projectName || bundleName) {
    console.log('⚠️  Warning: Both --project-name and --bundle-name are required for renaming.');
    console.log('   Usage: yarn setup --project-name "YourAppName" --bundle-name com.yourcompany.yourapp');
    console.log('   Continuing without renaming...\n');
  }

  console.log('📦 Installing dependencies...');
  execSync('yarn install', { stdio: 'inherit' });

  console.log('\n🔠 Linking font assets...');
  execSync('npx react-native-asset', { stdio: 'inherit' });

  console.log('\n🍎 Installing iOS dependencies...');
  execSync('cd ios && bundle install && bundle exec pod install && cd ..', { stdio: 'inherit' });

  console.log('\n✅ Setup completed successfully!');
  console.log('\n🚀 Run your app with:');
  console.log('  iOS:     yarn ios');
  console.log('  Android: yarn android');
  
  if (projectName && bundleName) {
    console.log(`\n📱 Your app "${projectName}" is ready to go!`);
    console.log(`\n📁 iOS project completely updated:`);
    console.log(`   • Folders renamed to "${projectName}"`);
    console.log(`   • AppDelegate.swift updated`);
    console.log(`   • Xcode scheme updated`);
  }
} catch (error) {
  console.error('\n❌ Setup failed with error:', error.message);
  process.exit(1);
}
