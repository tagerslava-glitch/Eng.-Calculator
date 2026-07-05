window.EngineeringTools = window.EngineeringTools || {};
let activeCalculatorId = null;

// Initialize the dashboard once the window loads
window.onload = function() {
    buildMenu();
};

function buildMenu() {
    const menu = document.getElementById('calc-menu');
    menu.innerHTML = '';
    
    // Loop through all registered tools and create a sidebar button
    for (const [id, calc] of Object.entries(window.EngineeringTools)) {
        const btn = document.createElement('button');
        btn.textContent = calc.name;
        btn.onclick = () => loadCalculator(id);
        menu.appendChild(btn);
    }
}

function loadCalculator(id) {
    const calc = window.EngineeringTools[id];
    activeCalculatorId = id;
    
    // Highlight active menu item
    document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    // Display container and set headers
    document.getElementById('calculator-content').style.display = 'block';
    document.getElementById('calc-title').textContent = calc.name;
    document.getElementById('calc-description').textContent = calc.description;
    
    // Inject and typeset LaTeX Equations
    document.getElementById('calc-equations').innerHTML = calc.equations;
    if (window.MathJax) {
        MathJax.typesetPromise([document.getElementById('calc-equations')]);
    }

    buildInputs(calc.inputs);
    buildOutputs(calc.outputs);
    
    // Run initial calculation
    runActiveCalculation();
}

function buildInputs(inputs) {
    const container = document.getElementById('inputs-container');
    container.innerHTML = '';

    inputs.forEach(input => {
        const group = document.createElement('div');
        group.className = 'input-group';
        
        const label = document.createElement('label');
        label.textContent = input.label;
        group.appendChild(label);

        const wrapper = document.createElement('div');
        wrapper.className = 'input-wrapper';

        let inputElement;
        
        if (input.type === 'select') {
            inputElement = document.createElement('select');
            input.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                inputElement.appendChild(option);
            });
            inputElement.value = input.defaultValue;
        } else {
            inputElement = document.createElement('input');
            inputElement.type = input.type || 'number';
            inputElement.value = input.defaultValue;
            if (input.step) inputElement.step = input.step;
            
            // Display value next to slider if it's a range
            if (input.type === 'range') {
                const valDisplay = document.createElement('span');
                valDisplay.style.marginLeft = '10px';
                valDisplay.style.minWidth = '40px';
                valDisplay.textContent = input.defaultValue;
                inputElement.oninput = (e) => { valDisplay.textContent = e.target.value; runActiveCalculation(); };
                wrapper.appendChild(inputElement);
                wrapper.appendChild(valDisplay);
            }
        }

        inputElement.id = `input-${input.id}`;
        if (input.type !== 'range') {
            inputElement.oninput = runActiveCalculation;
            inputElement.onchange = runActiveCalculation;
        }

        if (input.type !== 'range') wrapper.appendChild(inputElement);
        
        if (input.unit) {
            const unitSpan = document.createElement('span');
            unitSpan.className = 'unit';
            unitSpan.textContent = input.unit;
            wrapper.appendChild(unitSpan);
        }

        group.appendChild(wrapper);
        container.appendChild(group);
    });
}

function buildOutputs(outputs) {
    const container = document.getElementById('outputs-container');
    container.innerHTML = '';

    outputs.forEach(output => {
        const box = document.createElement('div');
        box.className = 'output-box';
        box.innerHTML = `
            <div class="label">${output.label}</div>
            <div>
                <span class="value" id="output-${output.id}">-</span>
                <span class="unit">${output.unit}</span>
            </div>
        `;
        container.appendChild(box);
    });
}

function runActiveCalculation() {
    if (!activeCalculatorId) return;
    const calc = window.EngineeringTools[activeCalculatorId];
    
    // Gather values
    const values = {};
    calc.inputs.forEach(input => {
        const el = document.getElementById(`input-${input.id}`);
        values[input.id] = parseFloat(el.value);
    });

    // Run custom physics logic
    const results = calc.logic(values);

    // Update outputs
    for (const [id, val] of Object.entries(results.outputs)) {
        const outEl = document.getElementById(`output-${id}`);
        if (outEl) {
            outEl.textContent = typeof val === 'number' ? val.toFixed(calc.outputs.find(o => o.id === id).decimals || 2) : val;
        }
    }

    // Update alerts
    const alertsContainer = document.getElementById('alerts-container');
    alertsContainer.innerHTML = '';
    if (results.alerts) {
        results.alerts.forEach(alert => {
            const div = document.createElement('div');
            div.className = `alert alert-${alert.type}`;
            div.innerHTML = `<strong>${alert.title}:</strong> ${alert.message}`;
            alertsContainer.appendChild(div);
        });
    }
}

function exportData() {
    if (!activeCalculatorId) return;
    const calc = window.EngineeringTools[activeCalculatorId];
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Parameter,Value,Unit\n";
    
    calc.inputs.forEach(input => {
        const val = document.getElementById(`input-${input.id}`).value;
        csvContent += `${input.label},${val},${input.unit || ''}\n`;
    });
    
    csvContent += "---\n";
    calc.outputs.forEach(output => {
        const val = document.getElementById(`output-${output.id}`).textContent;
        csvContent += `${output.label},${val},${output.unit || ''}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${calc.name.replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}