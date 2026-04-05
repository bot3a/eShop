import fs from "fs";
import path from "path";

const dir = "./";

function scan(dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);

    if (fs.statSync(fullPath).isDirectory()) {
      scan(fullPath);
    } else if (file.endsWith("_model.js")) {
      const content = fs.readFileSync(fullPath, "utf-8");

      console.log("\n📄", file);


      const refs = content.match(/ref:\s*"(.*?)"/g);
      if (refs) {
        refs.forEach((r) => console.log("   🔗", r));
      }

      const fields = content.match(/(\w+):\s*{[^}]*type:\s*(\w+)/g);
      if (fields) {
        fields.forEach((f) => console.log("   📌", f));
      }
    }
  });
}

scan(dir);
