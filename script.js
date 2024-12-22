document.addEventListener("DOMContentLoaded", function () {
    // 주요 HTML 요소 참조
    const dbValueElement = document.getElementById('dbValue'); // 현재 데시벨 표시 요소
    const avgDbValueElement = document.getElementById('avgDbValue'); // 평균 데시벨 표시 요소
    const maxDbValueElement = document.getElementById('maxDbValue'); // 최대 데시벨 표시 요소
    const warningElement = document.getElementById('warning'); // 경고 메시지 표시 요소
    const timeElement = document.getElementById('time'); // 현재 시간 표시 요소
    const recordButton = document.getElementById('recordButton'); // 기록 버튼 (시작/종료 전환)
    const recordingIndicator = document.getElementById('recordingIndicator'); // 기록 중임을 나타내는 UI 요소

    const bars = document.querySelectorAll('.bar'); // 데시벨 시각화를 위한 막대들
    let warningCount = 0; // 경고 횟수
    let cumulativeDbSum = 0; // 누적 데시벨 합계 (평균 계산용)
    let dbCount = 0; // 데시벨 데이터의 샘플 수
    let maxDbValue = 0; // 최대 데시벨 값 (현재까지의 최고치)
    let isRecording = false; // 기록 상태 플래그 (true일 때 기록 중)
    let startTime, endTime; // 기록 시작 및 종료 시간

    // CSV 데이터를 저장할 배열 (첫 행은 헤더)
    const csvData = [
        ["측정 시작 시간", "측정 종료 시간", "평균 데시벨", "최대 데시벨", "경고 횟수"]
    ];

    // 경고음 파일 로드
    const warningSound = new Audio('경고음.mp3'); // 경고음을 재생할 오디오 객체 (파일 경로 필요)

    // 현재 시간을 실시간으로 업데이트
    function updateTime() {
        timeElement.innerText = moment().format('LTS'); // LTS: 로컬 시간 형식 (시:분:초 표시)
    }

    setInterval(updateTime, 1000); // 1초마다 현재 시간 갱신

    // 마이크 접근 및 오디오 데이터 처리
    navigator.mediaDevices.getUserMedia({ audio: true }) // 마이크 접근 권한 요청
        .then(function (stream) {
            // 오디오 컨텍스트 및 분석기 초기화
            const audioContext = new (window.AudioContext || window.webkitAudioContext)(); // 오디오 신호를 처리하기 위한 객체
            const analyser = audioContext.createAnalyser(); // 오디오 데이터를 분석하는 객체
            const microphone = audioContext.createMediaStreamSource(stream); // 마이크로부터 오디오 데이터를 가져옴

            analyser.smoothingTimeConstant = 0.8; // 스무딩 계수 (데이터 변화의 민감도를 조절, 값이 클수록 변화가 부드러움)
            analyser.fftSize = 1024; // FFT 크기 (신호를 분석하기 위한 샘플 크기, 값이 클수록 정밀함)

            microphone.connect(analyser); // 마이크 데이터를 분석기에 연결

            // 실시간으로 데시벨 계산 및 UI 업데이트
            setInterval(function () {
                if (!isRecording) return; // 기록 중이 아니면 데이터 처리 중지

                const array = new Uint8Array(analyser.frequencyBinCount); // 주파수 데이터 배열 (각 주파수의 세기 값)
                analyser.getByteFrequencyData(array); // 주파수 데이터를 가져옴
                const values = array.reduce((a, b) => a + b, 0); // 모든 주파수의 합 계산
                const average = values / array.length; // 평균 값 계산
                const dbValue = Math.round(average); // 데시벨 값으로 변환

                // 현재 데시벨 업데이트
                dbValueElement.innerText = dbValue;

                // 누적 데시벨 및 평균 계산
                cumulativeDbSum += dbValue; // 누적 합계 업데이트
                dbCount++; // 샘플 수 증가
                const avgDbValue = Math.round(cumulativeDbSum / dbCount); // 평균 데시벨 계산
                avgDbValueElement.innerText = avgDbValue;

                // 최대 데시벨 업데이트
                if (dbValue > maxDbValue) { // 현재 데시벨이 최대치보다 크면 업데이트
                    maxDbValue = dbValue;
                    maxDbValueElement.innerText = maxDbValue; // 최대 데시벨 표시
                }

                // 경고 조건 처리
                if (dbValue > 40) { // 40dB 초과 시 경고
                    if (warningElement.style.display === 'none') { // 처음 경고 발생 시
                        warningCount++; // 경고 횟수 증가
                        document.getElementById('warningCount').innerText = `경고 횟수: ${warningCount}`;
                        warningSound.play(); // 경고음 재생
                    }
                    warningElement.style.display = 'block'; // 경고 메시지 표시
                } else {
                    warningElement.style.display = 'none'; // 경고 메시지 숨기기
                    warningSound.pause(); // 경고음 정지
                    warningSound.currentTime = 0; // 경고음 재생 위치 초기화
                }

                // 막대 애니메이션 업데이트 (데시벨 시각화)
                const barHeight = Math.min(300, (dbValue / 120) * 300); // 막대 높이를 데시벨 값에 비례하게 설정
                bars.forEach((bar) => {
                    bar.style.height = `${barHeight * (0.9 + Math.random() * 0.5)}px`; // 랜덤한 높이 변화로 애니메이션 효과 추가
                });

            }, 10); // 10ms마다 데이터 처리
        })
        .catch(function (err) {
            console.error('마이크 접근 실패:', err); // 마이크 권한 요청 실패 시 오류 메시지 출력
        });

    // 기록 버튼 클릭 이벤트
    recordButton.addEventListener("click", function () {
        if (isRecording) {
            // 기록 종료
            isRecording = false;
            endTime = moment(); // 종료 시간 기록
            const avgDbValue = Math.round(cumulativeDbSum / dbCount); // 평균 데시벨 계산

            // 측정 데이터를 CSV에 추가
            csvData.push([
                startTime.format(), // 시작 시간
                endTime.format(), // 종료 시간
                avgDbValue, // 평균 데시벨
                maxDbValue, // 최대 데시벨
                warningCount // 경고 횟수
            ]);

            // 데이터 초기화
            cumulativeDbSum = 0; // 누적 데시벨 합계 초기화
            dbCount = 0; // 샘플 수 초기화
            warningCount = 0; // 경고 횟수 초기화
            maxDbValue = 0; // 최대 데시벨 초기화
            avgDbValueElement.innerText = "0"; // 평균 데시벨 UI 초기화
            maxDbValueElement.innerText = "0"; // 최대 데시벨 UI 초기화
            document.getElementById('warningCount').innerText = "경고 횟수: 0"; // 경고 횟수 UI 초기화

            // 버튼 및 UI 상태 업데이트
            recordButton.innerText = "기록 시작"; // 버튼 텍스트 변경
            recordButton.classList.remove("stop"); // 정지 스타일 제거
            recordButton.classList.add("start"); // 시작 스타일 추가
            recordingIndicator.classList.add("hidden"); // 기록 상태 표시 숨김
        } else {
            // 기록 시작
            isRecording = true;
            startTime = moment(); // 시작 시간 기록
            cumulativeDbSum = 0; // 누적 합 초기화
            dbCount = 0; // 데이터 수 초기화
            warningCount = 0; // 경고 횟수 초기화
            maxDbValue = 0; // 최대 데시벨 초기화

            // 버튼 및 UI 상태 업데이트
            recordButton.innerText = "기록 종료"; // 버튼 텍스트 변경
            recordButton.classList.remove("start"); // 시작 스타일 제거
            recordButton.classList.add("stop"); // 정지 스타일 추가
            recordingIndicator.classList.remove("hidden"); // 기록 상태 표시 활성화
        }
    });

    // CSV 파일 생성 및 다운로드
    function downloadCSV() {
        const today = moment().format("YYYY-MM-DD"); // 현재 날짜를 파일 이름에 포함
        const csvFilename = `${today}-평균데시벨데이터베이스.csv`; // 파일 이름 생성

        // CSV 콘텐츠 생성
        const csvContent = "data:text/csv;charset=utf-8," 
            + csvData.map(e => e.join(",")).join("\n"); // CSV 형식으로 데이터 변환

        // 다운로드 링크 생성 및 실행
        const encodedUri = encodeURI(csvContent); // URI로 인코딩
        const link = document.createElement("a"); // 링크 요소 생성
        link.setAttribute("href", encodedUri); // 다운로드 경로 설정
        link.setAttribute("download", csvFilename); // 다운로드 파일 이름 설정
        document.body.appendChild(link); // 링크 추가

        link.click(); // 파일 다운로드 실행
        document.body.removeChild(link); // 링크 제거
    }

    // 페이지 종료 시 자동 CSV 다운로드
    window.addEventListener("beforeunload", function () {
        downloadCSV(); // 종료 시 CSV 다운로드 실행
    });
});
