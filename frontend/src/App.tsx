import { Routes, Route } from 'react-router-dom';
import { GamePage, VestingPage } from './pages';

function App() {
  return (
    <Routes>
      <Route path="/" element={<GamePage />} />
      <Route path="/vesting" element={<VestingPage />} />
    </Routes>
  );
}

export default App;
