import React from "react";
import Transcriptions from "./pages/Transcriptions";
import UploadForm from "./components/src/components/UploadForm"; // <-- add this import

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Speech to Text App</h1>
      <UploadForm /> {/* <-- add this line */}
      <Transcriptions />
    </div>
  );
}

export default App;
