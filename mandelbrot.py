import numpy as np
import matplotlib.pyplot as plt

def generate_mandelbrot(xmin, xmax, ymin, ymax, width, height, max_iter):
   
    # Create arrays of x and y coordinates
    x = np.linspace(xmin, xmax, width)
    y = np.linspace(ymin, ymax, height)
    
    # Create a 2D grid of complex numbers
    X, Y = np.meshgrid(x, y)
    C = X + Y * 1j

    # Initialize Z and the iteration count matrix
    Z = np.zeros_like(C)
    iterations = np.zeros(C.shape, dtype=int)
    
    # Create a mask for tracking which points haven't escaped yet
    mask = np.ones(C.shape, dtype=bool)

    for i in range(max_iter):
        # Update Z only for points that haven't escaped
        Z[mask] = Z[mask]**2 + C[mask]
        
        # Find points that escaped in this iteration
        escaped = np.abs(Z[mask]) > 2.0
        
        # Update the iterations matrix for escaped points
        mask_escaped = mask.copy()
        mask_escaped[mask] = escaped
        iterations[mask_escaped] = i
        
        # Remove escaped points from the active mask
        mask[mask_escaped] = False

    # For points that never escaped, set their iteration count to max_iter
    iterations[mask] = max_iter

    return iterations

if __name__ == "__main__":
    print("Generating Mandelbrot set...")
    
    # Set the viewport parameters
    xmin, xmax, ymin, ymax = -2.0, 0.5, -1.25, 1.25
    width, height = 1200, 1000
    max_iter = 150

    # Generate the fractal data
    iterations = generate_mandelbrot(xmin, xmax, ymin, ymax, width, height, max_iter)

    print("Plotting the fractal...")
    
    # Create the plot
    plt.figure(figsize=(12, 10))
    
    # 'twilight_shifted' or 'magma' are great colormaps for fractals
    plt.imshow(iterations, extent=[xmin, xmax, ymin, ymax], cmap='twilight_shifted', origin='lower')
    
    plt.title("Colorful Mandelbrot Set", fontsize=16)
    plt.colorbar(label="Iterations to escape")
    plt.xlabel("Real Part (Re)")
    plt.ylabel("Imaginary Part (Im)")
    
    # Save the output to a high-resolution image
    output_file = "mandelbrot.png"
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"Saved fractal to {output_file}")
    
    # Display the plot
    plt.show()
