import React from "react";
import Transcriptions from "./pages/Transcriptions";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Speech to Text App</h1>
      <Transcriptions />
    </div>
  );
}

export default App;
