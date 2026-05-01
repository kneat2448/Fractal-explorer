# Interactive Fractal Explorer

A high-performance, interactive fractal visualization tool built with **WebGL**, **GLSL**, and **Vanilla JavaScript**. This project allows real-time exploration of various 2D and 3D fractals with a modern, glassmorphism-inspired user interface.

## 🚀 Features

### ✨ Interactive WebGL Explorer
*   **Real-time Rendering**: Smooth 60 FPS exploration powered by GPU acceleration (WebGL 1.0).
*   **Multiple Fractal Types**:
    *   **Mandelbrot Set**: The classic complex plane fractal.
    *   **Julia Set**: Morphable structures based on complex constants.
    *   **Newton Fractal**: Visualization of the Newton-Raphson method convergence.
    *   **Sierpinski Pyramid (3D)**: Volumetric 3D fractal rendered via **Raymarching**.
    *   **Menger Sponge (3D)**: Infinite recursive cubic structure rendered in 3D space.
    *   **Pythagoras Tree (2D)**: Geometric recursive branching tree (rendered on 2D Canvas).
*   **Dynamic Controls**:
    *   Adjust exponents ($Z^N + C$), max iterations, and complex constants.
    *   Smooth zoom (mouse wheel) and panning (click & drag).
    *   3D Camera rotation (Pitch/Yaw) for volumetric fractals.
    *   Manual value input for precise mathematical exploration.
*   **Customization**: Multiple vibrant color schemes including "Twilight Shifted", "Magma", and "Electric Blue".

### 🐍 Python Backend
*   Includes the original `mandelbrot.py` script for static high-resolution generation using `NumPy` and `Matplotlib`.

## 🛠️ Technology Stack
*   **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6).
*   **Graphics Engine**: WebGL 1.0 / GLSL (Raymarching for 3D).
*   **Python**: NumPy, Matplotlib (for static generation).

## 🏃 Getting Started

### Web Application
The web app is purely client-side but requires a local server to load WebGL assets and handle security policies.

1.  Navigate to the project directory.
2.  Start a simple local server:
    ```bash
    # If you have Python installed:
    python -m http.server 8000
    ```
3.  Open your browser and visit `http://localhost:8000`.

### Python Script
To run the static Mandelbrot generator:

1.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
2.  Run the script:
    ```bash
    python mandelbrot.py
    ```

## 📸 Screenshots
*(Add your own screenshots here to showcase the stunning visuals!)*

## 📜 License
MIT License - feel free to use and expand upon this project!
