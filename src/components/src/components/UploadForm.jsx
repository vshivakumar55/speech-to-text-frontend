import React, { useState } from 'react';
import axios from 'axios';

const UploadForm = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setAudioFile(e.target.files[0]);
    setError(''); // Clear previous errors
  };

  const handleUpload = async () => {
    if (!audioFile) {
      setError('Please select an audio file.');
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioFile);

    try {
      setLoading(true);
      const res = await axios.post('http://localhost:5000/upload', formData);
      setTranscription(res.data.transcription);
      setError('');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error); // Backend error
      } else {
        setError('Something went wrong while uploading the file.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-2">Upload Audio</h2>
      <input type="file" onChange={handleFileChange} className="mb-2" />
      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {loading ? 'Transcribing...' : 'Upload'}
      </button>

      {error && (
        <p className="mt-2 text-red-500 font-medium">{error}</p>
      )}

      {transcription && (
        <div className="mt-4">
          <h3 className="font-semibold">Transcription:</h3>
          <p className="text-gray-700">{transcription}</p>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
