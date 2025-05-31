import { NextRequest, NextResponse } from 'next/server';
import https from 'https';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const artist = searchParams.get('artist');

    if (!title || !artist) {
      return NextResponse.json(
        { error: '제목과 아티스트가 필요합니다.' },
        { status: 400 }
      );
    }

    // 멜론 검색 API 호출 (멜론 웹사이트에서 사용하는 검색 API)
    const searchUrl = `https://www.melon.com/search/song/index.htm?q=${encodeURIComponent(`${artist} ${title}`)}&section=&searchGnbYn=Y&kkoSpl=Y&kkoDpType=&linkOrText=T&ipath=srch_form`;
    
    return new Promise<NextResponse>((resolve) => {
      const req = https.request(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            // HTML에서 앨범 이미지 URL 추출
            const imgRegex = /https:\/\/cdnimg\.melon\.co\.kr\/cm2\/album\/images\/[^"]+\.jpg/g;
            const matches = data.match(imgRegex);
            
            if (matches && matches.length > 0) {
              // 첫 번째 매칭된 이미지 URL 사용
              const coverUrl = matches[0];
              resolve(NextResponse.json({ coverUrl }));
            } else {
              resolve(NextResponse.json({ coverUrl: null }));
            }
          } catch (error) {
            console.error('멜론 앨범 커버 파싱 오류:', error);
            resolve(NextResponse.json({ coverUrl: null }));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('멜론 API 요청 오류:', error);
        resolve(NextResponse.json({ coverUrl: null }));
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(NextResponse.json({ coverUrl: null }));
      });
      
      req.end();
    });

  } catch (error) {
    console.error('멜론 앨범 커버 API 오류:', error);
    return NextResponse.json(
      { coverUrl: null },
      { status: 200 }
    );
  }
}