document.addEventListener("DOMContentLoaded", function () {
    const dbValueElement = document.getElementById('dbValue');
    const avgDbValueElement = document.getElementById('avgDbValue');
    const warningElement = document.getElementById('warning');
    const timeElement = document.getElementById('time');
    const recordButton = document.getElementById('recordButton');
    const recordingIndicator = document.getElementById('recordingIndicator');

    const bars = document.querySelectorAll('.bar');
    let warningCount = 0;
    let cumulativeDbSum = 0;
    let dbCount = 0;
    let isRecording = false;
    let startTime, endTime;

    // 전체 기록을 위한 CSV 데이터 배열
    const csvData = [
        ["측정 시작 시간", "측정 종료 시간", "평균 데시벨", "경고 횟수"]
    ];

    // 경고음 로드
    const warningSound = new Audio('경고음.mp3'); // 실제 경로로 변경

    function updateTime() {
        timeElement.innerText = moment().format('LTS');
    }

    setInterval(updateTime, 1000);

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);

            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 1024;

            microphone.connect(analyser);

            setInterval(function () {
                if (!isRecording) return; // 기록 중이 아닐 경우 무시

                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                const values = array.reduce((a, b) => a + b, 0);
                const average = values / array.length;
                const dbValue = Math.round(average);

                // 현재 데시벨 값 업데이트
                dbValueElement.innerText = dbValue;

                // 누적 합과 카운트 업데이트 후 평균 계산
                cumulativeDbSum += dbValue;
                dbCount++;
                const avgDbValue = Math.round(cumulativeDbSum / dbCount);
                avgDbValueElement.innerText = avgDbValue;

                if (dbValue > 40) {
                    if (warningElement.style.display === 'none') {
                        warningCount++;
                        document.getElementById('warningCount').innerText = `경고 횟수: ${warningCount}`;
                        warningSound.play(); // 경고음 재생
                    }
                    warningElement.style.display = 'block';
                } else {
                    warningElement.style.display = 'none';
                    warningSound.pause();
                    warningSound.currentTime = 0;
                }

                const barHeight = Math.min(300, (dbValue / 120) * 300);
                bars.forEach((bar) => {
                    bar.style.height = `${barHeight * (0.9 + Math.random() * 0.5)}px`;
                });

            }, 10);
        })
        .catch(function (err) {
            console.error('마이크 접근 실패:', err);
        });

    // 기록 버튼 이벤트 (시작/종료 전환)
    recordButton.addEventListener("click", function () {
        if (isRecording) {
            // 기록 종료
            isRecording = false;
            endTime = moment();
            const avgDbValue = Math.round(cumulativeDbSum / dbCount);

            // 측정 결과를 CSV 데이터 배열에 추가
            csvData.push([
                startTime.format(),
                endTime.format(),
                avgDbValue,
                warningCount
            ]);

            // 다음 기록을 위해 초기화
            cumulativeDbSum = 0;
            dbCount = 0;
            warningCount = 0;
            avgDbValueElement.innerText = "0";  // 평균 데시벨 표시 초기화
            document.getElementById('warningCount').innerText = "경고 횟수: 0";  // 경고 횟수 표시 초기화

            // 버튼 및 아이콘 표시 업데이트
            recordButton.innerText = "기록 시작";
            recordButton.classList.remove("stop");
            recordButton.classList.add("start");
            recordingIndicator.classList.add("hidden");
        } else {
            // 기록 시작
            isRecording = true;
            startTime = moment();
            cumulativeDbSum = 0;
            dbCount = 0;
            warningCount = 0;

            // 버튼 및 아이콘 표시 업데이트
            recordButton.innerText = "기록 종료";
            recordButton.classList.remove("start");
            recordButton.classList.add("stop");
            recordingIndicator.classList.remove("hidden");
        }
    });

    // CSV 파일 생성 및 다운로드 함수
    function downloadCSV() {
        const today = moment().format("YYYY-MM-DD");
        const csvFilename = `${today}-평균데시벨데이터베이스.csv`;

        // CSV 형식으로 데이터 변환
        const csvContent = "data:text/csv;charset=utf-8," 
            + csvData.map(e => e.join(",")).join("\n");

        // 다운로드 링크 생성
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", csvFilename);
        document.body.appendChild(link);

        link.click(); // 다운로드 실행
        document.body.removeChild(link); // 링크 삭제
    }

    // 페이지를 벗어날 때 CSV 파일 다운로드
    window.addEventListener("beforeunload", function () {
        downloadCSV();
    });
});
