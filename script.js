document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const mainScreen = document.getElementById('main-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');
    const maouWinScreen = document.getElementById('maou-win-screen');

    const displayPoints = document.getElementById('display-points');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const maouBattleBtn = document.getElementById('maou-battle-btn');
    const resetPointsBtn = document.getElementById('reset-points-btn');
    const mainMessage = document.getElementById('main-message');

    const quizCategoryTitle = document.getElementById('quiz-category-title');
    const timeLeftSpan = document.getElementById('time-left');
    const currentQuestionNumSpan = document.getElementById('current-question-num');
    const enemyImage = document.getElementById('enemy-image');
    const questionText = document.getElementById('question-text');
    const optionButtons = document.querySelectorAll('.option-btn');
    const skipQuestionBtn = document.getElementById('skip-question-btn');

    const finalScoreSpan = document.getElementById('final-score');
    const correctAnswersCountSpan = document.getElementById('correct-answers-count');
    const resultMessage = document.getElementById('result-message');
    const backToMainBtn = document.getElementById('back-to-main-btn');
    const restartGameBtn = document.getElementById('restart-game-btn');

    // --- 音声要素の取得 ---
    const fieldAudio = document.getElementById('field-audio');
    const seikaiAudio = document.getElementById('seikai-audio');
    const fuseikaiAudio = document.getElementById('fuseikai-audio');
    const levelupAudio = document.getElementById('levelup-audio');
    const maouAudio = document.getElementById('maou-audio');
    const sentouAudio = document.getElementById('sentou-audio');

    // --- ゲームの状態変数 ---
    let totalPoints = 0;
    let currentQuizData = []; // 現在のカテゴリのクイズデータ
    let currentQuestionIndex = 0;
    let correctAnswersInQuiz = 0;
    let timer;
    let timeLeft = 10;
    const QUIZ_QUESTIONS_PER_CATEGORY = 5;
    const POINTS_TO_UNLOCK_MAOU = 30;
    let quizCategory = '';
    let isMaouBattle = false; // 魔王戦中かどうか

    // --- クイズデータ ---
    let allQuizData = {}; // quizData.jsonから読み込むデータ

    // --- 初期化処理 ---
    function initializeGame() {
        loadGameData();
        updateMainScreen();
        showScreen(mainScreen);
        playAudio(fieldAudio);
    }

    // --- 画面切り替え関数 ---
    function showScreen(screenToShow) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        screenToShow.classList.add('active');
    }

    // --- 音声再生関数 ---
    function playAudio(audioElement, loop = false) {
        // 現在再生中のループ音があれば停止
        if (fieldAudio.paused === false && fieldAudio.loop) fieldAudio.pause();
        if (sentouAudio.paused === false && sentouAudio.loop) sentouAudio.pause();
        if (maouAudio.paused === false && maouAudio.loop) maouAudio.pause();

        audioElement.currentTime = 0; // 最初から再生
        audioElement.loop = loop;
        audioElement.play().catch(e => console.log("音声再生エラー:", e)); // ユーザー操作なしの自動再生はエラーになる可能性
    }

    function stopAudio(audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
    }

    // --- ゲームデータの保存・読み込み ---
    function saveGameData() {
        localStorage.setItem('knowledgeBattlePoints', totalPoints);
        localStorage.setItem('knowledgeBattleMaouUnlocked', totalPoints >= POINTS_TO_UNLOCK_MAOU);
        console.log("ゲームデータを保存しました:", totalPoints);
    }

    function loadGameData() {
        const savedPoints = localStorage.getItem('knowledgeBattlePoints');
        if (savedPoints !== null) {
            totalPoints = parseInt(savedPoints, 10);
        } else {
            totalPoints = 0;
        }
        updateMainScreen();
        console.log("ゲームデータを読み込みました:", totalPoints);
    }

    // --- メイン画面の更新 ---
    function updateMainScreen() {
        displayPoints.textContent = totalPoints;
        if (totalPoints >= POINTS_TO_UNLOCK_MAOU) {
            maouBattleBtn.disabled = false;
            mainMessage.textContent = '魔王との戦いが解放された！';
        } else {
            maouBattleBtn.disabled = true;
            mainMessage.textContent = `あと${POINTS_TO_UNLOCK_MAOU - totalPoints}ポイントで魔王に挑戦できるぞ！`;
        }
    }

    // --- クイズの開始 ---
    async function startQuiz(category) {
        quizCategory = category;
        isMaouBattle = (category === 'Maou');

        try {
            if (Object.keys(allQuizData).length === 0) { // まだデータが読み込まれていなければ読み込む
                const response = await fetch('quizData.json');
                allQuizData = await response.json();
            }

            let availableQuestions;
            if (isMaouBattle) {
                availableQuestions = allQuizData['Maou'];
                if (!availableQuestions || availableQuestions.length === 0) {
                    alert('魔王戦のデータがありません！開発者にお知らせください。');
                    return;
                }
            } else {
                availableQuestions = allQuizData[category];
                if (!availableQuestions || availableQuestions.length < QUIZ_QUESTIONS_PER_CATEGORY) {
                    alert('このカテゴリにはまだ問題が少ないようです...別のカテゴリを選んでね！');
                    return;
                }
            }
            
            // 問題をランダムに5問選択
            currentQuizData = [];
            const shuffledQuestions = [...availableQuestions].sort(() => 0.5 - Math.random());
            currentQuizData = shuffledQuestions.slice(0, QUIZ_QUESTIONS_PER_CATEGORY);
            
            currentQuestionIndex = 0;
            correctAnswersInQuiz = 0;
            quizCategoryTitle.textContent = isMaouBattle ? '魔王戦！' : category + 'クイズ';
            showScreen(quizScreen);
            
            if (isMaouBattle) {
                playAudio(maouAudio, true);
                enemyImage.src = 'images/maou.png'; // 魔王の画像
            } else {
                playAudio(sentouAudio, true);
                enemyImage.src = `images/enemy${Math.floor(Math.random() * 10) + 1}.png`; // ランダムな敵キャラ
            }

            loadQuestion();
        } catch (error) {
            console.error('クイズデータの読み込みまたは開始に失敗しました:', error);
            alert('クイズの準備中にエラーが発生しました。時間を置いてもう一度試してください。');
            showScreen(mainScreen); // エラー時はメイン画面に戻す
            playAudio(fieldAudio, true);
        }
    }

    // --- 問題の読み込みと表示 ---
    function loadQuestion() {
        if (currentQuestionIndex >= QUIZ_QUESTIONS_PER_CATEGORY) {
            endQuiz();
            return;
        }

        resetOptionsStyle();
        const question = currentQuizData[currentQuestionIndex];
        questionText.textContent = question.question;
        question.options.forEach((option, index) => {
            optionButtons[index].textContent = option;
            optionButtons[index].disabled = false; // ボタンを有効化
        });

        currentQuestionNumSpan.textContent = currentQuestionIndex + 1;
        startTimer();
    }

    // --- タイマー処理 ---
    function startTimer() {
        clearInterval(timer);
        timeLeft = 10;
        timeLeftSpan.textContent = timeLeft;
        timer = setInterval(() => {
            timeLeft--;
            timeLeftSpan.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timer);
                handleAnswer(null); // 時間切れ
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timer);
    }

    // --- 回答処理 ---
    function handleAnswer(selectedIndex) {
        stopTimer();
        const question = currentQuizData[currentQuestionIndex];
        const correctAnswerIndex = question.correct;

        // すべての選択肢を無効化
        optionButtons.forEach(btn => btn.disabled = true);

        if (selectedIndex === correctAnswerIndex) {
            correctAnswersInQuiz++;
            totalPoints += 1; // 正解で1ポイント
            playAudio(seikaiAudio);
            optionButtons[selectedIndex].classList.add('correct');
        } else {
            playAudio(fuseikaiAudio);
            if (selectedIndex !== null) { // 時間切れでなければ不正解のボタンを赤くする
                optionButtons[selectedIndex].classList.add('wrong');
            }
            optionButtons[correctAnswerIndex].classList.add('correct'); // 正解のボタンを緑にする
        }

        saveGameData();
        updateMainScreen(); // ポイント表示を更新

        // 次の問題へ進むか、結果画面へ
        setTimeout(() => {
            currentQuestionIndex++;
            loadQuestion();
        }, 1500); // 1.5秒後に次の問題へ
    }

    // --- オプションボタンのスタイルをリセット ---
    function resetOptionsStyle() {
        optionButtons.forEach(btn => {
            btn.classList.remove('correct', 'wrong');
        });
    }

    // --- クイズ終了処理 ---
    function endQuiz() {
        stopAudio(sentouAudio);
        stopAudio(maouAudio);

        if (isMaouBattle) {
            if (correctAnswersInQuiz >= QUIZ_QUESTIONS_PER_CATEGORY) { // 魔王戦は全問正解で勝利
                showScreen(maouWinScreen);
                stopAudio(fieldAudio); // 勝利画面ではフィールド音楽も止める
                playAudio(levelupAudio); // レベルアップ音を勝利音として流す
            } else {
                showResultScreen('残念！魔王は強かった...また挑戦しよう！');
            }
        } else {
            if (correctAnswersInQuiz >= QUIZ_QUESTIONS_PER_CATEGORY / 2) { // 半分以上正解でメッセージ
                playAudio(levelupAudio);
                showResultScreen('よくやった！知識がレベルアップしたぞ！');
            } else {
                showResultScreen('もう少し頑張ろう！');
            }
        }
    }

    // --- 結果画面の表示 ---
    function showResultScreen(message) {
        finalScoreSpan.textContent = totalPoints;
        correctAnswersCountSpan.textContent = correctAnswersInQuiz;
        resultMessage.textContent = message;
        showScreen(resultScreen);
        playAudio(fieldAudio, true); // メインBGMに戻す
    }

    // --- デバッグ機能：ポイントリセット ---
    function resetPoints() {
        if (confirm('本当にポイントをリセットしますか？')) {
            totalPoints = 0;
            saveGameData();
            updateMainScreen();
            mainMessage.textContent = 'ポイントがリセットされたぞ！';
        }
    }

    // --- デバッグ機能：問題スキップ ---
    function skipQuestion() {
        if (confirm('現在の問題をスキップして次の問題に進みますか？')) {
            stopTimer();
            currentQuestionIndex++;
            loadQuestion();
        }
    }

    // --- イベントリスナー ---
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            startQuiz(button.dataset.category);
        });
    });

    maouBattleBtn.addEventListener('click', () => {
        if (totalPoints >= POINTS_TO_UNLOCK_MAOU) {
            startQuiz('Maou');
        } else {
            alert(`魔王に挑戦するには、あと${POINTS_TO_UNLOCK_MAOU - totalPoints}ポイント必要だ！`);
        }
    });

    optionButtons.forEach((button, index) => {
        button.addEventListener('click', () => handleAnswer(index));
    });

    backToMainBtn.addEventListener('click', () => {
        showScreen(mainScreen);
        playAudio(fieldAudio, true);
    });

    restartGameBtn.addEventListener('click', () => {
        if (confirm('ゲームを最初からやり直しますか？現在のポイントもリセットされます。')) {
            totalPoints = 0;
            saveGameData();
            initializeGame(); // 全体を初期化してメイン画面へ
        }
    });

    resetPointsBtn.addEventListener('click', resetPoints);
    skipQuestionBtn.addEventListener('click', skipQuestion);

    // --- ページ読み込み時の初期化 ---
    initializeGame();
});
