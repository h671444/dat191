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
  
  // Funksjon for å vise et spørsmål og tilhørende svaralternativer
  function showQuestion() {
    const questionEl = document.getElementById("question");
    const choicesEl = document.getElementById("choices");
    const resultEl = document.getElementById("result");
    const nextButton = document.getElementById("nextButton");
    
    // Tilbakestill resultat og skjul "Neste"-knappen
    resultEl.textContent = "";
    nextButton.style.display = "none";
    
    // Hent gjeldende spørsmål
    const q = quizData[currentQuestion];
    questionEl.textContent = q.question;
    
    // Tøm tidligere alternativer
    choicesEl.innerHTML = "";
    
    // Lag knapper for hvert svaralternativ
    q.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.textContent = choice;
      button.classList.add("choice");
      button.addEventListener("click", () => {
        if (index === q.answer) {
          resultEl.textContent = "Riktig! Bra jobba!";
          nextButton.style.display = "inline-block";
        } else {
          resultEl.textContent = "Feil, prøv igjen!";
        }
      });
      choicesEl.appendChild(button);
    });
  }
  
  // Håndter "Neste"-knappen
  document.getElementById("nextButton").addEventListener("click", () => {
    currentQuestion++;
    if (currentQuestion < quizData.length) {
      showQuestion();
    } else {
      // Sluttmelding når quizen er fullført
      document.getElementById("question").textContent = "Gratulerer! Du har fullført quizen!";
      document.getElementById("choices").innerHTML = "";
      document.getElementById("nextButton").style.display = "none";
      document.getElementById("result").textContent = "";
    }
  });
  
  // Start quizen med det første spørsmålet
  showQuestion();
  