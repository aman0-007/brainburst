// Pre-loaded quiz packs for BrainBurst
const quizPacks = {
    general: {
        id: 'general',
        title: 'General Knowledge & Trivia',
        description: 'Classic trivia covering geography, science, history, and pop culture.',
        questions: [
            {
                text: "Which planet is known as the Red Planet?",
                answers: ["Venus", "Jupiter", "Mars", "Saturn"],
                correct: 2 // Mars
            },
            {
                text: "What is the fastest land animal?",
                answers: ["Cheetah", "Lion", "Horse", "Leopard"],
                correct: 0 // Cheetah
            },
            {
                text: "Which is the longest river in the world?",
                answers: ["Amazon", "Nile", "Yangtze", "Mississippi"],
                correct: 1 // Nile
            },
            {
                text: "What is the chemical symbol for Gold?",
                answers: ["Ag", "Fe", "Au", "Gd"],
                correct: 2 // Au
            },
            {
                text: "In what year was the first iPhone released?",
                answers: ["2005", "2007", "2009", "2010"],
                correct: 1 // 2007
            }
        ]
    },
    science: {
        id: 'science',
        title: 'Science, Space & Tech',
        description: 'Mind-bending questions about physics, the cosmos, and modern tech.',
        questions: [
            {
                text: "What is the powerhouse of the cell?",
                answers: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Body"],
                correct: 2
            },
            {
                text: "Who is widely considered the first computer programmer?",
                answers: ["Ada Lovelace", "Alan Turing", "Charles Babbage", "Grace Hopper"],
                correct: 0
            },
            {
                text: "Approximately how long does light from the Sun take to reach Earth?",
                answers: ["8 seconds", "8 minutes", "80 minutes", "Instantaneous"],
                correct: 1
            },
            {
                text: "What is the most abundant gas in Earth's atmosphere?",
                answers: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"],
                correct: 2
            },
            {
                text: "What does 'HTTP' stand for in web browsing?",
                answers: ["HyperText Transfer Protocol", "High-Tech Transport Process", "Home Text Tracking Port", "Hyper Tool Transmission Path"],
                correct: 0
            }
        ]
    },
    popculture: {
        id: 'popculture',
        title: 'Movies, Music & Pop Culture',
        description: 'Test your knowledge of blockbuster movies, chart-toppers, and iconic moments.',
        questions: [
            {
                text: "Which film was the first to surpass $2 Billion at the worldwide box office?",
                answers: ["Avatar", "Titanic", "Avengers: Endgame", "Jurassic Park"],
                correct: 1 // Titanic
            },
            {
                text: "Which artist released the legendary record 'Thriller'?",
                answers: ["Prince", "Stevie Wonder", "Michael Jackson", "David Bowie"],
                correct: 2
            },
            {
                text: "In Harry Potter, which house values courage and chivalry?",
                answers: ["Ravenclaw", "Hufflepuff", "Slytherin", "Gryffindor"],
                correct: 3
            },
            {
                text: "What is the name of Peter Parker's uncle whose motto was 'With great power...'?",
                answers: ["Uncle Bob", "Uncle Ben", "Uncle Dave", "Uncle Steve"],
                correct: 1
            },
            {
                text: "What is the highest-grossing video game franchise of all time?",
                answers: ["Super Mario", "Pokémon", "Call of Duty", "Grand Theft Auto"],
                correct: 1
            }
        ]
    },
    riddles: {
        id: 'riddles',
        title: 'Brain Teasers & Riddles',
        description: 'Fun, tricky riddles where quick thinking wins!',
        questions: [
            {
                text: "What has keys but can't open any locks?",
                answers: ["A map", "A piano", "A treasure chest", "A mystery clock"],
                correct: 1
            },
            {
                text: "The more of this there is, the less you see. What is it?",
                answers: ["Fog", "Darkness", "Rain", "Silence"],
                correct: 1
            },
            {
                text: "What can travel around the world while staying in a corner?",
                answers: ["A stamp", "A compass", "A satellite", "A coin"],
                correct: 0
            },
            {
                text: "What has a head and a tail, but no body?",
                answers: ["A snake", "A coin", "A comet", "A kite"],
                correct: 1
            },
            {
                text: "What has hands, but cannot clap?",
                answers: ["A glove", "A clock", "A statue", "A shadow"],
                correct: 1
            }
        ]
    }
};

module.exports = { quizPacks };
