import styles from "./page.module.css";
import Transcription from "@/components/Transcription";

export default function Home() {
  return (
    <div className={styles.box}>
      <Transcription />
    </div>
  );
}
