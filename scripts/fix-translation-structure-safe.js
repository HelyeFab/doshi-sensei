const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

// Read the English base file
const enPath = path.join(__dirname, '../src/config/strings/en.ts');
const enContent = fs.readFileSync(enPath, 'utf8');

// Parse the English file to extract the object structure
const enAst = parse(enContent, {
  sourceType: 'module',
  plugins: ['typescript']
});

let enObj = null;

// Extract the English object from AST
traverse(enAst, {
  ExportNamedDeclaration(path) {
    if (path.node.declaration && 
        path.node.declaration.type === 'VariableDeclaration' &&
        path.node.declaration.declarations[0].id.name === 'en') {
      const init = path.node.declaration.declarations[0].init;
      // Convert AST to object
      enObj = astToObject(init);
    }
  }
});

// Function to convert AST node to JavaScript object
function astToObject(node) {
  if (t.isObjectExpression(node)) {
    const obj = {};
    node.properties.forEach(prop => {
      if (t.isObjectProperty(prop)) {
        const key = prop.key.name || prop.key.value;
        obj[key] = astToObject(prop.value);
      }
    });
    return obj;
  } else if (t.isStringLiteral(node)) {
    return node.value;
  } else if (t.isNumericLiteral(node)) {
    return node.value;
  } else if (t.isBooleanLiteral(node)) {
    return node.value;
  } else if (t.isArrayExpression(node)) {
    return node.elements.map(el => astToObject(el));
  }
  return null;
}

// Function to convert object to AST
function objectToAst(obj) {
  if (typeof obj === 'string') {
    return t.stringLiteral(obj);
  } else if (typeof obj === 'number') {
    return t.numericLiteral(obj);
  } else if (typeof obj === 'boolean') {
    return t.booleanLiteral(obj);
  } else if (Array.isArray(obj)) {
    return t.arrayExpression(obj.map(item => objectToAst(item)));
  } else if (typeof obj === 'object' && obj !== null) {
    const properties = [];
    for (const key in obj) {
      properties.push(
        t.objectProperty(
          t.identifier(key),
          objectToAst(obj[key])
        )
      );
    }
    return t.objectExpression(properties);
  }
  return t.nullLiteral();
}

// Function to deep merge objects, preserving English structure
function deepMerge(english, translation) {
  const result = {};
  
  for (const key in english) {
    if (typeof english[key] === 'object' && english[key] !== null && !Array.isArray(english[key])) {
      // Nested object
      result[key] = deepMerge(
        english[key], 
        translation && translation[key] && typeof translation[key] === 'object' ? translation[key] : {}
      );
    } else {
      // Use translation if available, otherwise use English
      result[key] = (translation && translation[key] !== undefined) ? translation[key] : english[key];
    }
  }
  
  return result;
}

// Process each translation file
const languages = ['fr', 'it', 'de', 'es', 'ar', 'ko'];

languages.forEach(lang => {
  const translationPath = path.join(__dirname, `../src/config/strings/translations/${lang}.ts`);
  
  if (!fs.existsSync(translationPath)) {
    console.log(`Skipping ${lang} - file does not exist`);
    return;
  }
  
  console.log(`Processing ${lang}...`);
  
  try {
    // Read and parse the translation file
    const content = fs.readFileSync(translationPath, 'utf8');
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript']
    });
    
    let translationObj = null;
    
    // Extract the translation object from AST
    traverse(ast, {
      ExportNamedDeclaration(path) {
        if (path.node.declaration && 
            path.node.declaration.type === 'VariableDeclaration') {
          const init = path.node.declaration.declarations[0].init;
          translationObj = astToObject(init);
        }
      }
    });
    
    if (!translationObj) {
      console.error(`Could not extract object from ${lang}.ts`);
      return;
    }
    
    // Merge with English structure
    const mergedObj = deepMerge(enObj, translationObj);
    
    // Generate new AST
    const newAst = t.program([
      t.addComment(
        t.exportNamedDeclaration(
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier(lang),
              objectToAst(mergedObj)
            )
          ])
        ),
        'leading',
        ` Auto-generated translation file for ${lang.toUpperCase()}\n Generated on: ${new Date().toISOString()}\n Structure aligned with English base file\n`,
        true
      )
    ]);
    
    // Generate code from AST
    const { code } = generate(newAst, {
      retainLines: false,
      compact: false,
      concise: false
    });
    
    // Write the updated file
    fs.writeFileSync(translationPath, code);
    console.log(`✓ Updated ${lang}.ts with aligned structure`);
    
  } catch (error) {
    console.error(`Error processing ${lang}.ts:`, error.message);
  }
});

console.log('\nAll translation files have been updated with the correct structure!');