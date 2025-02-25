// const loadQuestions = async () => {
//   try {
//       const res = await fetch("../../assets/questions.json");
//       const data = await res.json();
//       return data;
//   } catch (e) {
//     console.log("Error loading questions", error);
//       return [];
//   }
// }




// Definer quiz-spørsmålene
const quizData = [
    {
      question: "Hva er 2 + 2?",
      choices: ["3", "4", "5"],
      answer: 1  // "4" er riktig (indeks 1)
    },
    {
      question: "Hvilken farge har himmelen?",
      choices: ["Blå", "Grønn", "Rød"],
      answer: 0  // "Blå" er riktig (indeks 0)
    },
    {
      question: "Hva sier katten?",
      choices: ["Mjau", "Voff", "Kvakk"],
      answer: 0  // "Mjau" er riktig (indeks 0)
    }
  ];
  
  let currentQuestion = 0;
  let score = 0;
  let isAnswered = false;
  
  // Viser et spørsmål og tilhørende svaralternativer
  function showQuestion() {
    const questionEl = document.getElementById("question");
    const choicesEl = document.getElementById("choices");
    const resultEl = document.getElementById("result");
    
    // Tilbakestill tilbakemeldingen
    resultEl.textContent = "";
    
    // Resett svarstatus for det nye spørsmålet
    isAnswered = false;
    
    // Hent gjeldende spørsmål
    const q = quizData[currentQuestion];
    questionEl.textContent = q.question;
    
    // Tøm tidligere svaralternativer
    choicesEl.innerHTML = "";
    
    // Lag en knapp for hvert svaralternativ, med tastetall foran
    q.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.textContent = `${index + 1}. ${choice}`;
      button.classList.add("choice");
      button.addEventListener("click", () => {
        if (!isAnswered) {
          if (index === q.answer) {
            resultEl.textContent = "Riktig! Bra jobba!";
            score++;
            updateScore();
            isAnswered = true;
            // Gå automatisk videre til neste spørsmål etter 1,5 sekunder
            setTimeout(() => {
              currentQuestion++;
              if (currentQuestion < quizData.length) {
                showQuestion();
              } else {
                questionEl.textContent = "Gratulerer! Du har fullført quizen!";
                choicesEl.innerHTML = "";
                resultEl.textContent = "";
              }
            }, 1500);
          } else {
            resultEl.textContent = "Feil, prøv igjen!";
          }
        }
      });
      choicesEl.appendChild(button);
    });
  }
  
  // Oppdaterer scorevisningen
  function updateScore() {
    const scoreEl = document.getElementById("score");
    scoreEl.textContent = `Poengsum: ${score}`;
  }
  
  // Legger til tastaturhåndtering for svaralternativene (tastene 1, 2, 3 osv.)
  document.addEventListener("keydown", (event) => {
    if (!isAnswered) {
      const key = event.key;
      if (key >= '1' && key <= '9') {
        const index = parseInt(key) - 1;
        const choicesEl = document.getElementById("choices");
        if (index < choicesEl.children.length) {
          choicesEl.children[index].click();
        }
      }
    }
  });
  
  // Starter quizen med det første spørsmålet
  showQuestion();
  