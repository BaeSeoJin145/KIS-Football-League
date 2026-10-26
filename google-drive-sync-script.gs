/**
 * ==============================================================================
 * KFL (KIS Football League) Google Drive Gallery Connector
 * ==============================================================================
 * 
 * [동작 원리]
 * 1. 상위 폴더(KFL-Gallery) 내의 모든 하위 폴더(팀명: 12-1, 12-2, 12-3...)를 탐색합니다.
 * 2. 관리자가 나중에 드라이브에서 수동으로 새 팀 폴더(예: 12-6, 11-1 등)를 만들면,
 *    웹사이트를 수정하지 않아도 자동으로 새 팀 탭이 생성됩니다.
 * 3. 각 폴더 안의 이미지들을 고화질 썸네일 URL과 함께 웹사이트로 전송합니다.
 * 
 * [배포 방법 (1분 소요)]
 * 1. https://script.google.com 접속 -> [새 프로젝트] 클릭
 * 2. 아래 코드를 Code.gs에 전체 덮어쓰기
 * 3. 아래 ROOT_FOLDER_ID에 KFL-Gallery 폴더 ID 입력
 *    (폴더 공유 링크 https://drive.google.com/drive/folders/1abc... 에서 1abc... 부분)
 * 4. 우측 상단 [배포] -> [새 배포] 클릭
 * 5. 유형: [웹 앱] 선택
 * 6. 액세스 권한: "모든 사용자(Anyone)" 로 설정하고 [배포] 클릭
 * 7. 생성된 "웹 앱 URL (https://script.google.com/macros/s/.../exec)" 복사
 * 8. KFL 웹사이트 [관리자] -> [구글 드라이브 갤러리] 탭의 URL 입력창에 붙여넣기!
 */

function doGet(e) {
  // -------------------------------------------------------------
  // 여기에 KFL-Gallery 폴더 ID를 입력하세요.
  // 예: "1AbCdEfGhIjKlMnOpQrStUvWxYz"
  // -------------------------------------------------------------
  const ROOT_FOLDER_ID = "YOUR_KFL_GALLERY_FOLDER_ID_HERE";

  try {
    const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const subFolders = rootFolder.getFolders();
    
    const foldersList = [];
    const allPhotos = [];

    // 하위 팀 폴더들 탐색
    while (subFolders.hasNext()) {
      const folder = subFolders.next();
      const folderName = folder.getName();
      foldersList.push({
        id: folder.getId(),
        name: folderName,
        url: folder.getUrl()
      });

      // 폴더 내 이미지 파일 탐색
      const files = folder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const mime = file.getMimeType();
        
        // 이미지 파일만 필터 (JPEG, PNG, WEBP, HEIC 등)
        if (mime.indexOf('image/') !== -1) {
          allPhotos.push({
            id: file.getId(),
            name: file.getName(),
            team: folderName, // 폴더 이름이 팀명이 됩니다 (12-1, 12-2 등)
            folderId: folder.getId(),
            folderUrl: folder.getUrl(),
            thumbnail: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000",
            viewUrl: "https://lh3.googleusercontent.com/d/" + file.getId(),
            driveUrl: file.getUrl(),
            created: file.getDateCreated().toISOString()
          });
        }
      }
    }

    // 팀 폴더 이름순 정렬 (자연 정렬: 12-1, 12-2, 12-3 ...)
    foldersList.sort(function(a, b) {
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    // 사진 최신 등록일순 정렬
    allPhotos.sort(function(a, b) {
      return new Date(b.created) - new Date(a.created);
    });

    const result = {
      status: "success",
      rootFolderName: rootFolder.getName(),
      rootFolderUrl: rootFolder.getUrl(),
      folders: foldersList,
      photos: allPhotos,
      totalPhotos: allPhotos.length
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
