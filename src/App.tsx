import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import PageHome from "./Pages/PageHome";
import PageRTL from "./Pages/PageRTL";
import PageTailwind from "./Pages/PageTailwind";
import { ThemeProvider } from "./Context/ThemeContext";
import ThemeToggle from "./Components/ThemeToggle";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 flex flex-col">
          <nav className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50 transition-colors duration-300">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="font-bold text-xl text-indigo-600 dark:text-indigo-400">DemoApp</div>
              <div className="flex items-center space-x-6">
                <ul className="flex space-x-6">
                  <li>
                    <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition">Home</Link>
                  </li>
                  <li>
                    <Link to="/rtl" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition">RTL</Link>
                  </li>
                  <li>
                    <Link to="/tailwind" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition">Tailwind</Link>
                  </li>
                </ul>
                <ThemeToggle />
              </div>
            </div>
          </nav>

          <main className="flex-grow container mx-auto py-8 px-4">
            <Routes>
              <Route path="/" element={<PageHome />} />
              <Route path="/rtl" element={<PageRTL />} />
              <Route path="/tailwind" element={<PageTailwind />} />
            </Routes>
          </main>

          <footer className="bg-gray-800 dark:bg-gray-950 text-white text-center p-4 transition-colors duration-300">
            <p>© 2026 Demo App - React & Tailwind</p>
          </footer>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;