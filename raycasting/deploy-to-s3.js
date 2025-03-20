/**
 * Deployment Script for Dungeon Adventure Game to Amazon S3
 * 
 * Prerequisites:
 * 1. AWS CLI installed and configured with appropriate credentials
 * 2. Node.js installed
 * 
 * Usage:
 * node deploy-to-s3.js <bucket-name> [region]
 * 
 * Example:
 * node deploy-to-s3.js my-dungeon-game us-east-1
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get command line arguments
const bucketName = process.argv[2];
const region = process.argv[3] || 'us-east-1';

// Validate bucket name
if (!bucketName) {
    console.error('Error: Bucket name is required');
    console.log('Usage: node deploy-to-s3.js <bucket-name> [region]');
    process.exit(1);
}

// Files and directories to deploy
const filesToDeploy = [
    'index.html',
    'game.js',
    'engine.js',
    'styles.css',
    'config.json',
    'assets',
    'README.md',
    'LICENSE'
];

// Check if all required files exist
console.log('Checking required files...');
let missingFiles = false;

filesToDeploy.forEach(file => {
    if (!fs.existsSync(file)) {
        console.error(`Error: Required file or directory not found: ${file}`);
        missingFiles = true;
    }
});

if (missingFiles) {
    console.error('Error: Some required files are missing. Deployment aborted.');
    process.exit(1);
}

// Create bucket if it doesn't exist
console.log(`Creating S3 bucket: ${bucketName} (if it doesn't exist)...`);
exec(`aws s3api head-bucket --bucket ${bucketName} 2>/dev/null || aws s3api create-bucket --bucket ${bucketName} --region ${region} ${region !== 'us-east-1' ? `--create-bucket-configuration LocationConstraint=${region}` : ''}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error creating bucket: ${error.message}`);
        return;
    }
    
    // Enable static website hosting
    console.log('Enabling static website hosting...');
    exec(`aws s3 website s3://${bucketName} --index-document index.html --error-document index.html`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error enabling static website hosting: ${error.message}`);
            return;
        }
        
        // Set bucket policy to allow public read access
        console.log('Setting bucket policy for public access...');
        const policy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Sid: 'PublicReadGetObject',
                    Effect: 'Allow',
                    Principal: '*',
                    Action: 's3:GetObject',
                    Resource: `arn:aws:s3:::${bucketName}/*`
                }
            ]
        };
        
// Use path.join to ensure correct path separators for the OS
const policyPath = path.join(__dirname, 'bucket-policy.json');
        fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2));
        
        exec(`aws s3api put-bucket-policy --bucket ${bucketName} --policy file://${policyPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error setting bucket policy: ${error.message}`);
                return;
            }
            
            // Upload files
            console.log('Uploading files to S3...');
            const uploadCommands = filesToDeploy.map(file => {
                if (fs.lstatSync(file).isDirectory()) {
                    // Use forward slashes for S3 paths even on Windows
                    return `aws s3 sync "${file}" s3://${bucketName}/${file.replace(/\\/g, '/')} --acl public-read`;
                } else {
                    return `aws s3 cp "${file}" s3://${bucketName}/${file.replace(/\\/g, '/')} --acl public-read`;
                }
            });
            
            // Execute upload commands in sequence
            executeCommands(uploadCommands, 0, () => {
                // Clean up
                fs.unlinkSync(policyPath);
                
                // Get website URL
                console.log('\nDeployment completed successfully!');
                console.log(`Your game is now available at: http://${bucketName}.s3-website-${region}.amazonaws.com/`);
                console.log('\nNote: It might take a few minutes for the changes to propagate.');
            });
        });
    });
});

/**
 * Execute commands in sequence
 * @param {string[]} commands - Array of commands to execute
 * @param {number} index - Current command index
 * @param {Function} callback - Callback function to call when all commands are executed
 */
function executeCommands(commands, index, callback) {
    if (index >= commands.length) {
        callback();
        return;
    }
    
    console.log(`Executing: ${commands[index]}`);
    exec(commands[index], (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        
        executeCommands(commands, index + 1, callback);
    });
}
