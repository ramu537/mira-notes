import AiCaptureDialog from "./AiCaptureDialog";

export default function AiNoteCaptureModal(props) {
  return <AiCaptureDialog {...props} targetDomain={"NOTE"}
    title="Capture a note"
    description="Keep an idea, meeting notes, or text from an image."
    placeholder="Key ideas, meeting takeaways, a question to explore…"
    label="Your thoughts or source text"
    imageLabel="Add a handwritten note or page photo" />;
}
