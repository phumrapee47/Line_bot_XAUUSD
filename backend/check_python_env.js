#!/usr/bin/env node

/**
 * Check Python Environment
 * Diagnostic script to verify Python and dependencies are accessible from Node.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('='.repeat(60));
console.log('Python Environment Diagnostic');
console.log('='.repeat(60));

console.log('\n1. Checking Python version...');
const python = spawn('python', ['--version']);

let pythonVersion = '';
let pythonError = '';

python.stdout.on('data', (data) => {
  pythonVersion += data.toString();
});

python.stderr.on('data', (data) => {
  pythonError += data.toString();
});

python.on('close', (code) => {
  if (code === 0) {
    console.log(`   ✓ ${pythonVersion.trim()}`);
  } else {
    console.log(`   ✗ Failed to get Python version: ${pythonError}`);
  }

  console.log('\n2. Checking required Python modules...');
  
  const modules = ['yfinance', 'feedparser', 'pandas', 'numpy', 'json'];
  let checked = 0;

  modules.forEach((module) => {
    const check = spawn('python', ['-c', `import ${module}; print("${module} OK")`]);
    
    let output = '';
    let error = '';

    check.stdout.on('data', (data) => {
      output += data.toString();
    });

    check.stderr.on('data', (data) => {
      error += data.toString();
    });

    check.on('close', (code) => {
      checked++;
      if (code === 0) {
        console.log(`   ✓ ${output.trim()}`);
      } else {
        console.log(`   ✗ ${module}: ${error.split('\n')[0]}`);
      }

      if (checked === modules.length) {
        console.log('\n3. Testing technical_model.py...');
        testTechnicalModel();
      }
    });
  });
});

function testTechnicalModel() {
  const scriptPath = path.join(__dirname, '../ml-models/technical_model.py');
  console.log(`   Script path: ${scriptPath}`);
  
  const test = spawn('python', [scriptPath]);
  
  let output = '';
  let error = '';

  test.stdout.on('data', (data) => {
    output += data.toString();
  });

  test.stderr.on('data', (data) => {
    error += data.toString();
  });

  test.on('close', (code) => {
    if (code === 0) {
      try {
        const result = JSON.parse(output);
        console.log(`   ✓ Script executed successfully`);
        console.log(`     - Price: $${result.price.toFixed(2)}`);
        console.log(`     - TP: $${result.tp.toFixed(2)}`);
        console.log(`     - SL: $${result.sl.toFixed(2)}`);
        console.log(`     - Probability: ${(result.probability * 100).toFixed(2)}%`);
      } catch (e) {
        console.log(`   ✗ Script output is not valid JSON: ${e.message}`);
        console.log(`   Output: ${output.substring(0, 200)}`);
      }
    } else {
      console.log(`   ✗ Script failed with code ${code}`);
      console.log(`   Error: ${error.substring(0, 500)}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Diagnostic complete');
    console.log('='.repeat(60));
  });
}
