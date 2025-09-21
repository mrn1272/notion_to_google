function cleanAndConvertWithRename() {
  var root = DriveApp.getFolderById("MY_FOLDER_ID");
  processFolder(root, true);
  Logger.log("=== DONE ===");
}

function processFolder(folder, isRoot) {
  if (!isRoot) {
    var folderName = folder.getName();
    var newFolderName = folderName
      .replace(/\s+[a-f0-9]{32}\.md$/i, "")
      .replace(/\s+[a-f0-9]{32}$/i, "");
    if (newFolderName !== folderName) {
      folder.setName(newFolderName);
      Logger.log("Renamed folder: " + folderName + " → " + newFolderName);
    }
  }

  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    var mime = file.getMimeType();
    var cleanName = name
        .replace(/\s+[a-f0-9]{32}\.md$/i, "")
        .replace(/\s+[a-f0-9]{32}\.csv$/i, "");

    Logger.log("Found file: " + name + "  | MIME: " + mime);

    if (cleanName !== name) {
      if (mime === "application/vnd.google-apps.document") {
        // Already a Google Doc -> only renaming
        file.setName(cleanName);
        Logger.log("Renamed Google Doc: " + cleanName);

      } else if ((mime === "text/markdown" || mime === "text/plain") && name.toLowerCase().endsWith(".md")) {
        // Markdown → Google Doc
        convertWithDriveCopy(file, folder, cleanName, "application/vnd.google-apps.document");

      } else if (mime === "text/csv" && name.toLowerCase().endsWith(".csv")) {
        // CSV → Google Sheet
        convertWithDriveCopy(file, folder, cleanName, "application/vnd.google-apps.spreadsheet");

      } else {
        Logger.log("Skipping: " + name + "  | unknown MIME");
      }
    }
  }

  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    processFolder(subfolders.next(), false);
  }
}

function convertWithDriveCopy(file, folder, cleanName, targetMime) {
  try {
    var newFile = Drive.Files.copy(
      {
        title: cleanName,
        mimeType: targetMime,
        parents: [{ id: folder.getId() }]
      },
      file.getId(),
      { supportsAllDrives: true }
    );

    // Force renaming
    DriveApp.getFileById(newFile.id).setName(cleanName);

    // Remove orginal file
    file.setTrashed(true);

    Logger.log("Converted to " + targetMime + ": " + cleanName);
  } catch (e) {
    Logger.log("Error converting " + file.getName() + ": " + e);
  }
}

function isRoot(folder) {
  var parents = folder.getParents();
  return !parents.hasNext();
}
