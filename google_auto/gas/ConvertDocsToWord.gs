function convertDocsToWord() {
  const sourceFolderIds = [
    '1jA0UwCHPFDo-Nutn7m_I-DTJhk2N4wG-',
    // '追加するフォルダIDをここに記載',
  ];
  const outputFolderId = '1ylH419h-HBMEf3Jy5Eot3o2Ll0fLwsjG';

  convertFilesInFolders(sourceFolderIds, outputFolderId, MimeType.GOOGLE_DOCS, 'document', 'docx');
}
