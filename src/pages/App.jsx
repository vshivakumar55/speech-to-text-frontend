import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// The main application component
const App = () => {
    const [transcriptions, setTranscriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [recording, setRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Firebase state
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // 1. Firebase Initialization and Authentication
    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                const app = initializeApp(firebaseConfig);
                const authInstance = getAuth(app);
                const firestoreInstance = getFirestore(app);

                setAuth(authInstance);
                setDb(firestoreInstance);

                if (initialAuthToken) {
                    await signInWithCustomToken(authInstance, initialAuthToken);
                } else {
                    await signInAnonymously(authInstance);
                }

                onAuthStateChanged(authInstance, (user) => {
                    if (user) {
                        setUserId(user.uid);
                        setIsAuthReady(true);
                    } else {
                        setUserId(null);
                        setIsAuthReady(false);
                    }
                });
            } catch (err) {
                console.error("Firebase initialization or authentication error:", err);
                setError("Failed to initialize Firebase. Please check console for details.");
            }
        };

        initializeFirebase();
    }, []);

    // 2. Fetch Transcriptions from Firestore
    useEffect(() => {
        if (!db || !userId || !isAuthReady) {
            return;
        }

        const userTranscriptionsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/transcriptions`);
        const q = query(userTranscriptionsCollectionRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTranscriptions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            fetchedTranscriptions.sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate());
            setTranscriptions(fetchedTranscriptions);
            setError(null);
        }, (err) => {
            console.error("Error fetching transcriptions:", err);
            setError("Failed to load transcriptions. Please try again.");
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady, appId]);

    const startRecording = async () => {
        setError(null);
        setAudioBlob(null);
        setAudioUrl(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone. Please ensure permissions are granted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    const handleFileUpload = (event) => {
        setError(null);
        setAudioBlob(null);
        setAudioUrl(null);
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('audio/')) {
                setError("Invalid file type. Please upload an audio file.");
                return;
            }
            setAudioBlob(file);
            setAudioUrl(URL.createObjectURL(file));
        }
    };

    // --- UPDATED: Connect to the live backend and save transcription to Firestore ---
    const uploadAudioAndTranscribe = async () => {
        if (!audioBlob) {
            setError("No audio to transcribe. Please record or upload an audio file.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Your live backend URL. This is the URL that works in Postman.
            const API_URL = 'https://speech-to-text-backend-m58u.onrender.com/transcriptions';

            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');

            // Make the fetch call to your live backend
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload and transcribe audio.');
            }

            const result = await response.json();
            // Get the transcription text from the backend response
            const transcriptionText = result.transcription;

            // Save the transcription text to Firestore
            await saveTranscriptionToDB(transcriptionText);

        } catch (err) {
            console.error("Error during transcription:", err);
            setError(err.message || "An error occurred during transcription. Please try again.");
        } finally {
            setLoading(false);
            setAudioBlob(null);
            setAudioUrl(null);
        }
    };

    const saveTranscriptionToDB = async (transcriptionText) => {
        if (!db || !userId) {
            setError("Database not initialized or user not authenticated.");
            return;
        }
        try {
            const userTranscriptionsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/transcriptions`);
            await addDoc(userTranscriptionsCollectionRef, {
                text: transcriptionText,
                timestamp: serverTimestamp(),
                audioType: audioBlob ? audioBlob.type : 'unknown',
                userId: userId,
            });
            setError(null);
        } catch (err) {
            console.error("Error saving transcription to DB:", err);
            setError("Failed to save transcription to database.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200 flex flex-col items-center justify-center p-4 font-inter">
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

            {/* Main Content Area */}
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl transform transition-all duration-300 hover:scale-[1.01] mb-8">
                <h1 className="text-4xl font-bold text-center text-indigo-700 mb-6">
                    Speech-to-Text App
                </h1>

                {userId && (
                    <p className="text-sm text-gray-500 text-center mb-4">
                        Your User ID: <span className="font-mono bg-gray-100 p-1 rounded-md text-purple-700 break-all">{userId}</span>
                    </p>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> {error}</span>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                    <label htmlFor="audio-upload" className="cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        Upload Audio File
                        <input id="audio-upload" type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                    </label>

                    <button
                        onClick={recording ? stopRecording : startRecording}
                        className={`px-6 py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 flex items-center justify-center ${
                            recording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                        disabled={loading}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 013-3h.01a3 3 0 013 3v6a3 3 0 01-3 3z"></path></svg>
                        {recording ? 'Stop Recording' : 'Record Audio'}
                    </button>
                </div>

                {audioUrl && (
                    <div className="mb-6 text-center">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Preview Audio:</h3>
                        <audio controls src={audioUrl} className="w-full rounded-lg shadow-md"></audio>
                    </div>
                )}

                <button
                    onClick={uploadAudioAndTranscribe}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 font-semibold text-lg"
                    disabled={loading || !audioBlob}
                >
                    {loading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Transcribing...
                        </span>
                    ) : 'Transcribe Audio'}
                </button>
            </div>

            {/* Transcriptions History Section */}
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl transform transition-all duration-300 hover:scale-[1.01]">
                <h2 className="text-3xl font-bold text-center text-indigo-700 mb-6">
                    Transcription History
                </h2>
                {transcriptions.length === 0 ? (
                    <p className="text-center text-gray-500">No transcriptions yet. Upload or record audio to get started!</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {transcriptions.map((t) => (
                            <div key={t.id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                                <p className="text-gray-800 text-md leading-relaxed mb-2">{t.text}</p>
                                <p className="text-sm text-gray-500 text-right">
                                    {t.timestamp ? new Date(t.timestamp.toDate()).toLocaleString() : 'Loading date...'}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
