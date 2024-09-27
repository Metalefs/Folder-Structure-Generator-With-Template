# 🌳 Scaffold Directories with Template files

Scaffold complex files in your VS Code projects with ease! This extension allows you to generate folder hierarchies with customized template files using simple text input, supporting both indented and markdown-style tree formats.

![gif-scaffold](https://github.com/user-attachments/assets/7a4bb527-319e-48f8-b6c5-141131a46ff9)

## ✨ Features

- 📁 Create folder structures from text input
- 🔀 Support for indented and markdown-style tree formats
- 📄 Generate empty files within the structure
- 📁 Generate files with a template within the structure
- 📁 Accepts custom configuration files per directory
- 📊 Create a report of the generated structure
- 🚀 Works with your current workspace or any selected folder

## 📥 Installation

1. Open VS Code
2. Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "Scaffold Folder Structure With Custom File Templates"
4. Click Install

## 🚀 Usage

1. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
2. Type "Generate Folder Structure" and select the command
3. In the new document that opens, enter your desired folder structure using either of these formats:

   Indented format:
   ```
   src/
       app/
           layout.js
           page.js
       components/
           Button.js
           Header.js
   ```

   Markdown-style tree format:
   ```
   src
   ├── app
   │   ├── layout.js
   │   └── page.js
   └── components
       ├── Button.js
       └── Header.js
   ```

4. Run the "Process Folder Structure" command from the Command Palette
5. Select the folder where you want to create the structure
6. 🎉 The extension will create the folder structure and show a summary

## Custom Template for File Generation

You can customize the template for each generated file by creating a `template.json` file inside the directory where you are generating the structure.
**new changes to template.json require reopening vs code to take effect**

### Template Format:

#### `content`: (string)
- **Description**: Defines the base content for **all files**.
- **Example**: `"export interface {{fileNamePascalCase}} {{body}}"`
  
  In this case, the filename (converted to PascalCase) and body content will be interpolated into the template.

#### `useFileName`: (object)
- **Description**: Replaces specific text within filenames based on the defined rules.
  - `findText`: (string) – The text in the filename that you want to replace.
    - **Example**: For the file `some-api-route.request.ts`, set `findText` to `.request.ts`.
  - `replaceWith`: (string) – The replacement for `findText`.
    - **Example**: Set `{"replaceWith": "RequestDto"}`. If `findText` is `.request.ts`, the token `{{fileNamePascalCase}}` becomes `SomeApiRouteRequestDto`.

#### `customTemplates`: (object)
- **Description**: Customizes the body content based on specific file name patterns.
  - `fileName`: (string) – Matches a filename [without extension] to apply the template.
  - `body`: (string) – Content to replace the `{{body}}` token in the template.
  - `requestBody`: (string) – Content for the `{{body}}` token **when the filename contains the word "request"**.
  - `responseBody`: (string) – Content for the `{{body}}` token **when the filename contains the word "response"**.
  - `match`: (string) – Used to match a filename when the filename repeats across directories. For example, `"match": "/api/v1/azure"` ensures that the template is applied if the file name ends with '`\\/api/v1/azure`'. This is useful for generating API models based on routes.

---

### Available Tokens (Interpolated into `content`):
- `{{fileName}}`: The raw filename [with extension].
- `{{fileNamePascalCase}}`: The filename converted from kebab-case to PascalCase.
- `{{fileNameCamelCase}}`: The filename converted from kebab-case to camelCase.
- `{{body}}`: The body content, which will be replaced with `body`, `requestBody`, or `responseBody`, depending on the filename.

> **Note**: The tokens will not affect the actual content of the `body` string.

---

### Example Usage:

```json
{
  "content": "export interface {{fileNamePascalCase}} {{body}}",
  "useFileName": {
    "findText": ".request.ts",
    "replaceWith": "RequestDto"
  },
  "customTemplates": {
    "fileName": "some-file.ts",
    "body": "Default body content",
    "requestBody": "Request-specific body content",
    "responseBody": "Response-specific body content",
    "match": "/api/v1/azure"
  }
}
```

In this example:
- If a file is named `some-api-route.request.ts`, the `{{fileNamePascalCase}}` token in the content will be replaced with `SomeApiRouteRequestDto`.
- The `{{body}}` token will be replaced with the appropriate content depending on the file name or match.

---

## 👥 Contributing

We welcome contributions to the Folder Structure Generator! Here's how you can help:

1. 🍴 Fork the repository
2. 🌿 Create a new branch for your feature or bug fix
3. 🛠️ Make your changes
4. ✅ Write or update tests as necessary
5. 🧪 Ensure all tests pass
6. 📤 Submit a pull request with a clear description of your changes

### 🛠️ Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Open the project in VS Code
4. Press F5 to start debugging and test your changes

### 📝 Coding Guidelines

- Follow the existing code style
- Write clear, commented code
- Update documentation for any new features or changes

## 💬 Feedback and Issues

If you encounter any issues or have suggestions for improvements, please open an issue on our GitHub repository. We'd love to hear from you! 😊

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Made with ❤️ from Pakistan 🇵🇰

Thank you for using and contributing to Folder Structure Generator! 🙏
