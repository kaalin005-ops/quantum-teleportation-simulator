document.addEventListener('DOMContentLoaded', function () {
    // Initialize controls
    const psiAngleSlider = document.getElementById('psi_angle');
    const noiseLevelSlider = document.getElementById('noise_level');
    const angleValue = document.getElementById('angle_value');
    const noiseValue = document.getElementById('noise_value');
    const simulateBtn = document.getElementById('simulate_btn');
    const noiseAnalysisBtn = document.getElementById('noise_analysis_btn');
    const resetBtn = document.getElementById('reset_btn');

    // Step navigation elements
    const prevStepBtn = document.getElementById('prev-step');
    const nextStepBtn = document.getElementById('next-step');
    const stepCounter = document.getElementById('step-counter');
    const stepDescription = document.getElementById('step-description');
    const circuitDiagram = document.getElementById('circuit-diagram');
    const progressFill = document.getElementById('progress-fill');
    const currentStepDisplay = document.getElementById('current_step');

    let currentStep = 0;
    let totalSteps = 7;
    let currentStepData = null;

    // Update display values
    psiAngleSlider.addEventListener('input', function () {
        const angle = parseFloat(this.value);
        const degrees = (angle * 180 / Math.PI).toFixed(1);
        angleValue.textContent = `${angle.toFixed(2)} rad (${degrees}°)`;
    });

    noiseLevelSlider.addEventListener('input', function () {
        const noise = parseFloat(this.value);
        noiseValue.textContent = `${noise.toFixed(2)} ${noise === 0 ? '(Perfect)' : noise < 0.1 ? '(Good)' : noise < 0.3 ? '(Fair)' : '(Poor)'}`;
    });

    // Step navigation
    prevStepBtn.addEventListener('click', function () {
        if (currentStep > 0) {
            currentStep--;
            updateStepDisplay();
        }
    });

    nextStepBtn.addEventListener('click', function () {
        if (currentStep < totalSteps - 1) {
            currentStep++;
            updateStepDisplay();
        }
    });

    // Simulation function
    simulateBtn.addEventListener('click', function () {
        runSimulation();
    });

    // Noise analysis function
    noiseAnalysisBtn.addEventListener('click', function () {
        runNoiseAnalysis();
    });

    // Reset function
    resetBtn.addEventListener('click', function () {
        psiAngleSlider.value = '0.78';
        noiseLevelSlider.value = '0.0';
        angleValue.textContent = '0.78 rad (45.0°)';
        noiseValue.textContent = '0.00 (Perfect)';

        // Reset step navigation
        currentStep = 0;
        currentStepData = null;
        updateStepDisplay();

        // Clear results
        document.getElementById('bloch_sphere').innerHTML = '<div class="plot-placeholder">Bloch sphere visualization loading...</div>';
        document.getElementById('measurement_plot').innerHTML = '<div class="plot-placeholder">Measurement distribution will appear here</div>';
        document.getElementById('fidelity_value').textContent = '-';
        document.getElementById('current_noise').textContent = '-';
        document.getElementById('noise_analysis_plot').style.display = 'none';
    });

    function updateStepDisplay() {
        if (!currentStepData) {
            stepDescription.textContent = 'Ready to explore quantum teleportation? Click "Run Teleportation" to begin the journey!';
            circuitDiagram.innerHTML = '<pre>Quantum circuit visualization will appear here...</pre>';
            stepCounter.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
            progressFill.style.width = '14.28%';
            currentStepDisplay.textContent = '1';
            return;
        }

        // Update step navigation
        prevStepBtn.disabled = currentStep === 0;
        nextStepBtn.disabled = currentStep === totalSteps - 1;
        stepCounter.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
        currentStepDisplay.textContent = (currentStep + 1).toString();

        // Update progress bar
        const progress = ((currentStep + 1) / totalSteps) * 100;
        progressFill.style.width = `${progress}%`;

        // Update description and circuit
        stepDescription.textContent = currentStepData.step_descriptions[currentStep];
        circuitDiagram.innerHTML = `<pre style="white-space: pre-wrap; font-family: 'Fira Code', 'Courier New', monospace; color: #73daca; background: #1a1b26; padding: 15px; border-radius: 5px;">${currentStepData.step_circuits[currentStep]}</pre>`;

        // Add animation
        circuitDiagram.classList.add('step-transition');
        setTimeout(() => {
            circuitDiagram.classList.remove('step-transition');
        }, 500);
    }

    async function runSimulation() {
        const psiAngle = parseFloat(psiAngleSlider.value);
        const noiseLevel = parseFloat(noiseLevelSlider.value);
        const shots = parseInt(document.getElementById('shots').value);

        simulateBtn.disabled = true;
        simulateBtn.innerHTML = '<div class="loading"></div> Running...';

        try {
            const response = await fetch('/simulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    psi_angle: psiAngle,
                    noise_level: noiseLevel,
                    shots: shots
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                currentStepData = data;
                currentStep = 0;
                updateStepDisplay();
                updateResultsDisplay(data);
                simulateBtn.classList.add('success-pulse');
                setTimeout(() => simulateBtn.classList.remove('success-pulse'), 600);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Simulation error:', error);
            alert('Error running simulation: ' + error.message);
        } finally {
            simulateBtn.disabled = false;
            simulateBtn.innerHTML = '🚀 Run Teleportation';
        }
    }

    function updateResultsDisplay(data) {
        // Update Bloch sphere
        document.getElementById('bloch_sphere').innerHTML =
            `<img src="data:image/png;base64,${data.bloch_sphere}" alt="Bloch Sphere" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">`;

        // Update measurement plot
        createMeasurementPlot(data.counts, data.measurement_probabilities);

        // Update metrics
        document.getElementById('fidelity_value').textContent =
            (data.fidelity * 100).toFixed(2) + '%';
        document.getElementById('current_noise').textContent =
            (data.noise_level * 100).toFixed(2) + '%';
    }

    function createMeasurementPlot(counts, probabilities) {
        const measurementKeys = Object.keys(counts);
        const measurementValues = Object.values(counts);
        const probabilityValues = Object.values(probabilities);

        const plotContainer = document.getElementById('measurement_plot');

        // Clear previous content
        plotContainer.innerHTML = '';

        // Use Plotly if available
        if (typeof Plotly !== 'undefined') {
            try {
                const trace = {
                    x: measurementKeys,
                    y: measurementValues,
                    type: 'bar',
                    text: probabilityValues.map(p => (p * 100).toFixed(1) + '%'),
                    textposition: 'auto',
                    marker: {
                        color: measurementKeys.map(key =>
                            key.startsWith('0') ? '#4CAF50' : '#2196F3'
                        )
                    }
                };

                const layout = {
                    title: 'Measurement Outcomes Distribution',
                    xaxis: {
                        title: 'Measurement Outcome (q2 q1 q0)',
                        tickangle: -45
                    },
                    yaxis: { title: 'Count' },
                    showlegend: false,
                    height: 400
                };

                Plotly.newPlot(plotContainer, [trace], layout);
            } catch (plotlyError) {
                console.log('Plotly failed, using HTML fallback');
                createHTMLMeasurementPlot(counts, probabilities, plotContainer);
            }
        } else {
            createHTMLMeasurementPlot(counts, probabilities, plotContainer);
        }
    }

    function createHTMLMeasurementPlot(counts, probabilities, container) {
        let html = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h4 style="color: #333; margin-bottom: 15px;">Measurement Outcomes Distribution</h4>
            </div>
            <div class="measurement-bars">
        `;

        Object.keys(counts).forEach(key => {
            const percentage = (probabilities[key] * 100).toFixed(1);
            const barHeight = Math.max(20, (probabilities[key] * 150)) + 'px';
            const count = counts[key];
            const color = key.startsWith('0') ? '#4CAF50' : '#2196F3';

            html += `
                <div class="measurement-bar">
                    <div class="bar-label">${key}</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="height: ${barHeight}; background-color: ${color};"></div>
                    </div>
                    <div class="bar-value">${count}</div>
                    <div class="bar-percentage">${percentage}%</div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    async function runNoiseAnalysis() {
        const psiAngle = parseFloat(psiAngleSlider.value);

        noiseAnalysisBtn.disabled = true;
        noiseAnalysisBtn.innerHTML = '<div class="loading"></div> Analyzing...';

        try {
            const response = await fetch('/noise_analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    psi_angle: psiAngle
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                displayNoiseAnalysis(data);
                noiseAnalysisBtn.classList.add('success-pulse');
                setTimeout(() => noiseAnalysisBtn.classList.remove('success-pulse'), 600);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Noise analysis error:', error);
            alert('Error running noise analysis: ' + error.message);
        } finally {
            noiseAnalysisBtn.disabled = false;
            noiseAnalysisBtn.innerHTML = '📈 Noise Analysis';
        }
    }

    function displayNoiseAnalysis(data) {
        const plotDiv = document.getElementById('noise_plot');
        const analysisSection = document.getElementById('noise_analysis_plot');

        // Clear previous content
        plotDiv.innerHTML = '';
        analysisSection.style.display = 'block';

        // Use Plotly if available
        if (typeof Plotly !== 'undefined') {
            try {
                const trace = {
                    x: data.noise_levels,
                    y: data.fidelities,
                    type: 'scatter',
                    mode: 'lines+markers',
                    line: { color: '#2196F3', width: 3 },
                    marker: {
                        size: 8,
                        color: '#2196F3'
                    },
                    name: 'Fidelity'
                };

                const layout = {
                    title: 'Noise Level vs Teleportation Fidelity',
                    xaxis: {
                        title: 'Noise Level',
                        tickformat: '.0%',
                        range: [0, 0.5]
                    },
                    yaxis: {
                        title: 'Fidelity',
                        range: [0, 1.1],
                        tickformat: '.0%'
                    },
                    showlegend: false,
                    height: 500
                };

                Plotly.newPlot(plotDiv, [trace], layout);
            } catch (plotlyError) {
                console.log('Plotly failed for noise analysis, using image');
                plotDiv.innerHTML = `<img src="data:image/png;base64,${data.plot}" alt="Noise Analysis" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">`;
            }
        } else {
            plotDiv.innerHTML = `<img src="data:image/png;base64,${data.plot}" alt="Noise Analysis" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;">`;
        }
    }

    // Initialize
    updateStepDisplay();

    // Auto-run simulation on load
    setTimeout(() => {
        runSimulation();
    }, 1000);
});