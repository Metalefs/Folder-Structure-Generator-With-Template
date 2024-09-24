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
#     └── ExpenseForm.tsx

# Format 2 (indented):
# src/
#     app/
#         layout.tsx
#         page.tsx
#     components/
#         ExpenseForm.tsx

# You can use a template for the generated files by creating template.json file in selected folder 
# Params:
# content: string to interpolate with tokens
# replace: {text: string to replace from name, with: string to replace matched text with}

# Tokens :
# {{fileNamePascalCase}}: (interpolation) converted kebab-case filename to PascalCase
# {{fileNameCamelCase}}: (interpolation) converted kebab-case filename to CamelCase

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
    template = require(path.join(rootPath, './template.json'));
  }
  catch(error){
    console.error("Error in createFolderStructure:", error);
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

function processTreeStructure(rootPath, lines, template) {
  let folderCount = 0;
  let fileCount = 0;
  const stack = [{ path: rootPath, depth: -1 }];

  lines.forEach((line, index) => {
    try {
      const depth = line.search(/[^\s│]/); // Find the first non-space, non-│ character
      const name = line.replace(/^[│ ]*[└├]──\s*/, "").trim();

      // Pop items from stack if we're at a shallower depth
      while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }

      const parentPath = stack[stack.length - 1].path;
      const fullPath = path.join(parentPath, name);
      const parsedName = name.replace(template.replace.text || '', template.replace.with || '');
      const parsedTemplate = template.content ? 
        template.content
        .replace('{{fileNamePascalCase}}', toPascalCase(parsedName || ''))
        .replace('{{fileNameCamelCase}}', toCamelCase(parsedName || '')): '';

      if (name.includes(".")) {
        fs.writeFileSync(fullPath, parsedTemplate);
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
}

function processIndentedStructure(rootPath, lines, template) {
  const stack = [{ path: rootPath, level: -1 }];
  let folderCount = 0;
  let fileCount = 0;

  lines.forEach((line, index) => {
    try {
      const trimmedLine = line.trimStart();
      const level = line.length - trimmedLine.length;
      const name = trimmedLine.replace(/\/$/g, "");

      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      const parentPath = stack[stack.length - 1].path;
      const currentPath = path.join(parentPath, name);
      const parsedName = name.replace(template.replace.text || '', template.replace.with || '');
      const parsedTemplate = template.content ? 
      template.content
      .replace('{{fileNamePascalCase}}', toPascalCase(parsedName || ''))
      .replace('{{fileNameCamelCase}}', toCamelCase(parsedName || '')): '';

      if (name.includes(".")) {
        fs.writeFileSync(currentPath, parsedTemplate);
        fileCount++;
      } else {
        fs.mkdirSync(currentPath, { recursive: true });
        folderCount++;
        stack.push({ path: currentPath, level });
      }
    } catch (error) {
      console.error(`Error processing line ${index + 1}: ${line}`, error);
      throw error;
    }
  });

  return { folderCount, fileCount };
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
