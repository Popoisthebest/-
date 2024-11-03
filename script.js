document.addEventListener("DOMContentLoaded", function () {
    const dbValueElement = document.getElementById('dbValue');
    const avgDbValueElement = document.getElementById('avgDbValue');
    const warningElement = document.getElementById('warning');
    const timeElement = document.getElementById('time');
    
    const bars = document.querySelectorAll('.bar');
    let warningCount = 0;
    let cumulativeDbSum = 0;
    let dbCount = 0;

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
                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                const values = array.reduce((a, b) => a + b, 0);
                const average = values / array.length;
                const dbValue = Math.round(average);

                // Update current dB value
                dbValueElement.innerText = dbValue;

                // Update cumulative sum and count, then calculate average
                cumulativeDbSum += dbValue;
                dbCount++;
                const avgDbValue = Math.round(cumulativeDbSum / dbCount);
                avgDbValueElement.innerText = avgDbValue;

                if (dbValue > 40) {
                    if (warningElement.style.display === 'none') {
                        warningCount++;
                        document.getElementById('warningCount').innerText = `경고 횟수: ${warningCount}`;
                    }
                    warningElement.style.display = 'block';
                } else {
                    warningElement.style.display = 'none';
                }

                const barHeight = Math.min(300, (dbValue / 120) * 300);

                bars.forEach((bar, index) => {
                    bar.style.height = `${barHeight * (0.9 + Math.random() * 0.5)}px`;
                });

            }, 10);
        })
        .catch(function (err) {
            console.error('마이크 접근 실패:', err);
        });
});
