function convertSheetsToExcel() {
  const sourceFolderIds = [
    '17NUktwOSniJ0ZMQ8ViBxFqKzVswtrXKx',
    '1jA0UwCHPFDo-Nutn7m_I-DTJhk2N4wG-',
  ];
  const outputFolderId = '1ylH419h-HBMEf3Jy5Eot3o2Ll0fLwsjG';

  convertFilesInFolders(sourceFolderIds, outputFolderId, MimeType.GOOGLE_SHEETS, 'spreadsheets', 'xlsx');
}
