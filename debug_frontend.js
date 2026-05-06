#!/usr/bin/env node
/**
 * Debug startup script for ADMIPAEDIA frontend with enhanced development features.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Debug configuration
const DEBUG_CONFIG = {
    NODE_ENV: 'development',
    REACT_APP_DEBUG: 'true',
    REACT_APP_API_URL: 'http://localhost:5000/api/v1',
    REACT_APP_SOCKET_URL: 'http://localhost:5000',
    REACT_APP_LOG_LEVEL: 'debug',
    BROWSER: 'none', // Don't auto-open browser
    GENERATE_SOURCEMAP: 'true',
    FAST_REFRESH: 'true',
    ESLINT_NO_DEV_ERRORS: 'true',
    TSC_COMPILE_ON_ERROR: 'true',
    DISABLE_ESLINT_PLUGIN: 'false'
};

function setupDebugEnvironment() {
    console.log('🔧 Setting up debug environment for frontend...');
    
    // Set environment variables
    Object.assign(process.env, DEBUG_CONFIG);
    
    console.log('✅ Debug environment configured');
    console.log('   🔧 React development server with hot reload');
    console.log('   🔧 Source maps enabled for debugging');
    console.log('   🔧 Enhanced error reporting');
    console.log('   🔧 TypeScript compilation on error');
    console.log('   🔧 ESLint warnings (non-blocking)');
}

function startFrontendDebug() {
    console.log('🚀 Starting ADMIPAEDIA Frontend in Debug Mode');
    console.log('=' .repeat(50));
    
    setupDebugEnvironment();
    
    const frontendDir = path.join(__dirname, 'frontend');
    
    // Check if frontend directory exists
    if (!fs.existsSync(frontendDir)) {
        console.error('❌ Frontend directory not found:', frontendDir);
        process.exit(1);
    }
    
    console.log(`📁 Frontend directory: ${frontendDir}`);
    console.log('🌐 Development server will start on: http://localhost:3000');
    console.log('🔧 API proxy configured for: http://localhost:5000/api/v1/');
    console.log('🔧 Press Ctrl+C to stop the server');
    console.log('=' .repeat(50));
    
    // Start the development server
    const devServer = spawn('npm', ['run', 'dev'], {
        cwd: frontendDir,
        stdio: 'inherit',
        env: process.env,
        shell: true
    });
    
    devServer.on('error', (error) => {
        console.error('❌ Failed to start frontend development server:', error);
        process.exit(1);
    });
    
    devServer.on('close', (code) => {
        if (code !== 0) {
            console.error(`❌ Frontend development server exited with code ${code}`);
        } else {
            console.log('🛑 Frontend development server stopped');
        }
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping frontend development server...');
        devServer.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
        console.log('\n🛑 Stopping frontend development server...');
        devServer.kill('SIGTERM');
    });
}

if (require.main === module) {
    startFrontendDebug();
}

module.exports = { startFrontendDebug, DEBUG_CONFIG };