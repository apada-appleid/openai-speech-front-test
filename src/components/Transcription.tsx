"use client";

import axios from "axios";
import { useState, useRef, useEffect } from "react";
import styles from "@/app/styles/Transcription.module.css";
import { OPENAI_API_URL, WS_URL } from "@/app/constants/url";

const Transcription = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speechMessage, setSpeechMessage] = useState<boolean>(false);

  const [file, setFile] = useState<File | null>(null);
  const [recording, setRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );

  const [messages, setMessages] = useState<{ sender: string; text: string }[]>(
    []
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);
    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "content") {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.sender === "PEPE") {
            // Append to the last PEPE message
            return [
              ...prev.slice(0, -1),
              { sender: "PEPE", text: lastMessage.text + message.content },
            ];
          } else {
            // Add a new PEPE message
            return [...prev, { sender: "PEPE", text: message.content }];
          }
        });
      } else if (message.type === "done") {
        setSpeechMessage(true);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  // handle text to speech after PEPE message is done
  useEffect(() => {
    if (speechMessage) {
      handleTextToSpeech();
    }
  }, [speechMessage]);

  // initial message from PEPE
  useEffect(() => {
    const initialMessage = "Hi, how can I help you today?";

    handleTextToSpeech(initialMessage);
    setMessages([{ sender: "PEPE", text: initialMessage }]);
  }, []);

  const handleStartRecording = async () => {
    if (!recording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.start();
      setRecording(true);
    }
  };

  const handleStopRecording = () => {
    if (recording && mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);

      mediaRecorder.onstop = () => {
        setLoading(true);
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/mp3",
        });
        const audioFile = new File([audioBlob], "recording.mp3", {
          type: "audio/mp3",
        });
        setFile(audioFile);
        audioChunksRef.current = [];
      };
    }
  };

  const handlePlayAudio = () => {
    if (audioUrl) {
      setIsPlaying(true);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  console.log(process.env.NEXT_PUBLIC_OPENAI_API_KEY);
  // handle transcription from audio file
  useEffect(() => {
    const speechToText = async () => {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("model", "whisper-1");

        const response = await axios.post(
          `${OPENAI_API_URL}/audio/transcriptions`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY || ""}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const transcription = response.data.text;
        setMessages((prev) => [...prev, { sender: "Me", text: transcription }]);
        ws.current?.send(transcription);
      }
    };

    speechToText();
  }, [file]);

  const handleTextToSpeech = async (text?: string) => {
    try {
      setSpeechMessage(false);

      const response = await axios.post(
        `${OPENAI_API_URL}/audio/speech`,
        {
          input: text || messages[messages?.length - 1]?.text,
          model: "tts-1",
          voice: "alloy",
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY || ""}`,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
        }
      );

      const audioBlob = new Blob([response.data], { type: "audio/mp3" });

      const audioUrl = URL.createObjectURL(audioBlob);

      // set audio url to state to play audio later by clicking the play button
      setAudioUrl(audioUrl);

      // handle auto playback (if not initial text because of chrome policy)
      if (!text) {
        // play audio immediately
        const audio = new Audio(audioUrl);
        audio.play();
      }
      setLoading(false);
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.messageContainer}>
        {messages.map((msg, index) => (
          <div className={styles.message} key={index}>
            <div className={styles.sender}>{msg.sender}</div>
            <div
              className={
                msg.sender === "Me" ? styles.userMessage : styles.aiMessage
              }
            >
              {msg.text}
              {index === messages.length - 1 &&
                msg.sender === "PEPE" &&
                audioUrl && (
                  <button
                    className={styles.playButton}
                    onClick={handlePlayAudio}
                    disabled={loading || isPlaying}
                  >
                    {isPlaying ? "🔊" : "▶️"}
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.controlsContainer}>
        <button
          onClick={recording ? handleStopRecording : handleStartRecording}
          className={`${styles.recordButton} ${
            recording ? styles.recording : ""
          }`}
          disabled={isPlaying}
        >
          {recording ? "■" : "●"}
        </button>
      </div>
    </div>
  );
};

export default Transcription;
