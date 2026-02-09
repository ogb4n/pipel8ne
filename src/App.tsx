import { useState } from "react";
import Hello from "./Components/Hello";
import "./App.css";

function App() {
  // You can set here the initial state of the app
  return (
    <div className="App">
      <header className="App-header">
        {/* main test component */}
        <Hello />
      </header>
    </div>
  );
}

export default App;
