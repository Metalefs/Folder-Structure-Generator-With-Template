const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function toCamelCase(text) {
  return text.replace(/-\w/g, clearAndUpper);
}

function toPascalCase(text) {
  return text.replace(/(^\w|-\w)/g, clearAndUpper);
}

function clearAndUpper(text) {
  return text.replace(/-/, "").toUpperCase();
}

function activate(context) {
  console.log("Folder Structure Generator is now active!");

  let generateCommand = vscode.commands.registerCommand("extension.generateFolderStructure", async function () {
    const document = await vscode.workspace.openTextDocument({
      content: `# Enter your folder structure here
# You can use either of these formats:

# Format 1 (tree-like):
# src
# ├── app
# │   ├── layout.tsx
# │   └── page.tsx
# └── components
#     └── ExpenseForm.tsx\\{{optional match string for custom template}}

# Format 2 (indented):
# src/
#     app/
#         layout.tsx
#         page.tsx
#     components/
#         ExpenseForm.tsx\\{{optional match string for custom template}}

# You can use a custom template for each generated file by creating a 'template.json' file inside the folder you are creating the structure in:

# Format:
# - content: "string" - Base content for ALL Files. Example: "export interface {{fileNamePascalCase}} {{body}}"
# - useFileName: {
      "findText": string, - String to replace from file name. Example: File 'some-api-route.request.ts', findText '.request.ts' and replace with value in 'replaceWith'.
      "replaceWith": string, - String to replace value in 'findText' with. Example: {"replaceWith": "RequestDto"}. In this cenario, '{{fileNamePascalCase}}' will be 'SomeApiRouteRequestDto' (and the content will render as "export interface SomeApiRouteRequestDto")
    }
# - customTemplates: {
      "fileName": string, - Used to match a filename with the template
      "body": string, - Content to display in {{body}} token      
      "requestBody": string, - Content to display in {{body}} token, **WHEN THE FILE NAME INCLUDES THE WORD 'request' ANYWHERE**
      "responseBody": string, - Content to display in {{body}} token, **WHEN THE FILE NAME INCLUDES THE WORD 'response' ANYWHERE**
      "match": string - used to match a filename with the template (in cases where the filename repeats across directories), i.g you use an API route ?: (example "match": '/api/v1/azure', the file name in folder structure must be 'file-name.extension\\/api/v1/azure') #GOOD FOR GENERATING API MODELS 
    }
  *You can find this example in the description.

# Tokens : (will be interpolated in 'content')
# - {{fileName}}: (interpolation) raw filename
# - {{fileNamePascalCase}}: (interpolation) converted kebab-case filename to PascalCase
# - {{fileNameCamelCase}}: (interpolation) converted kebab-case filename to CamelCase
# - {{body}}: (interpolation) template body, either requestBody, responseBody, or body.
  *The tokens wont affect the body string.
`,
      language: "plaintext",
    });

    await vscode.window.showTextDocument(document);
    vscode.window.showInformationMessage(
      'Enter your folder structure, then run the "Process Folder Structure" command'
    );
  });

  let processCommand = vscode.commands.registerCommand("extension.processFolderStructure", async function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor");
      return;
    }

    try {
      let workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined;

      const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select Folder",
        defaultUri: workspaceFolder,
      });

      if (!folderUri || folderUri.length === 0) {
        vscode.window.showInformationMessage("Folder selection cancelled");
        return;
      }

      const rootPath = folderUri[0].fsPath;
      const input = editor.document.getText();

      const { folderCount, fileCount } = createFolderStructure(rootPath, input);

      const message = `Folder structure created successfully!\n${folderCount} folders and ${fileCount} files were created.`;
      const action = await vscode.window.showInformationMessage(message, "Open Folder", "Generate Report");

      if (action === "Open Folder") {
        let uri = vscode.Uri.file(rootPath);
        await vscode.commands.executeCommand("vscode.openFolder", uri);
      } else if (action === "Generate Report") {
        await generateReport(rootPath, input);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error creating folder structure: ${error.message}`);
      console.error("Full error:", error);
    }
  });

  context.subscriptions.push(generateCommand, processCommand);
}

function createFolderStructure(rootPath, input) {
  const lines = input.split("\n").filter((line) => !line.trim().startsWith("#") && line.trim() !== "");
  const isTreeFormat = lines.some((line) => line.includes("├──") || line.includes("└──") || line.includes("│"));

  let folderCount = 0;
  let fileCount = 0;
  let template = "";

  try{    
    template = require(path.join(rootPath, '/template.json'));
  }
  catch(error){
    console.error("Error in createFolderStructure (while getting template):", error);
  }

  try {
    if (isTreeFormat) {
      ({ folderCount, fileCount } = processTreeStructure(rootPath, lines, template));
    } else {
      ({ folderCount, fileCount } = processIndentedStructure(rootPath, lines, template));
    }
  } catch (error) {
    console.error("Error in createFolderStructure:", error);
    throw error;
  }

  return { folderCount, fileCount };
}

function getBody(template, safeName, matchString){
  const match = template.customTemplates?.find(item => item.fileName.split('.')[0] === safeName.split('.')[0] || item.match.toLowerCase().trim() === matchString?.toLowerCase().trim());
  if(!match) return '';
  if(safeName.includes('request')) {
    return match.requestBody || '';
  }
  else if(safeName.includes('response')){
    return match.responseBody || '';
  }
  else {
    return match.body || '';
  }
}

const processStructure = (rootPath, lines, template, getDepthAndName) => {
  let folderCount = 0;
  let fileCount = 0;
  const stack = [{ path: rootPath, depth: -1 }];

  lines.forEach((line, index) => {
    try {
      const { depth, safeName, matchString } = getDepthAndName(line);
      
      // Pop items from stack if we're at a shallower depth
      while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }

      const parentPath = stack[stack.length - 1].path;
      const fullPath = path.join(parentPath, safeName).trim();
      
      const replacedName = safeName.replace(template.useFileName.findText || '', template.useFileName.replaceWith || '');
      const replacedContent = template.content 
        ? template.content
          .replace('{{fileName}}', replacedName || '')
          .replace('{{fileNamePascalCase}}', toPascalCase(replacedName || ''))
          .replace('{{fileNameCamelCase}}', toCamelCase(replacedName || ''))
          .replace('{{body}}', getBody(template, safeName, matchString)) 
        : '';

      if (safeName.includes(".")) {
        fs.writeFileSync(fullPath, replacedContent);
        fileCount++;
      } else {
        fs.mkdirSync(fullPath, { recursive: true });
        folderCount++;
        stack.push({ path: fullPath, depth });
      }
    } catch (error) {
      console.error(`Error processing line ${index + 1}: ${line}`, error);
      throw error;
    }
  });

  return { folderCount, fileCount };
};

function processTreeStructure(rootPath, lines, template) {
  return processStructure(rootPath, lines, template, (line) => {
    const depth = line.search(/[^\s│]/); // Find the first non-space, non-│ character
    const name = line.replace(/^[│ ]*[└├]──\s*/, "").trim();
    const [safeName, x, matchString] = name.split('\\');
    return { depth, safeName, matchString };
  });
}

function processIndentedStructure(rootPath, lines, template) {
  return processStructure(rootPath, lines, template, (line) => {
    const trimmedLine = line.trimStart();
    const depth = line.length - trimmedLine.length;
    const name = trimmedLine.replace(/\/$/g, "");
    const [safeName, x, matchString] = name.split('\\');
    return { depth, safeName, matchString };
  });
}

async function generateReport(rootPath, input) {
  const reportContent = `# Folder Structure Report\n\n\`\`\`\n${input}\n\`\`\``;
  const reportPath = path.join(rootPath, "folder_structure_report.md");
  fs.writeFileSync(reportPath, reportContent);
  const uri = vscode.Uri.file(reportPath);
  await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(uri);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
