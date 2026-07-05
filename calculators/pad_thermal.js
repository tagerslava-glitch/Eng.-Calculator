window.EngineeringTools = window.EngineeringTools || {};

window.EngineeringTools['pad_thermal'] = {
    name: "Thermal Pad Conductivity",
    description: "Evaluates the steady-state thermal performance and interfacial resistance of a gap pad under pressure.",
    
    // LaTeX formatted equations to display in the UI
    equations: `
        $$R_{total} = \\frac{t_{compressed}}{k \\cdot A} + \\frac{2}{h_i \\cdot A}$$
        $$\\Delta t = \\frac{t_{initial} \\cdot p}{E}(1 - 2\\mu)$$
        $$Bi = \\frac{h_i \\cdot t_{compressed}}{k}$$
    `,

    // The UI definitions (Your custom Gem will generate this block)
    inputs: [
        { id: "thickness", label: "Initial Thickness", unit: "mm", type: "number", defaultValue: 1.0, step: "0.1" },
        { id: "length", label: "Pad Length", unit: "mm", type: "number", defaultValue: 25 },
        { id: "width", label: "Pad Width", unit: "mm", type: "number", defaultValue: 25 },
        { id: "power", label: "Power Dissipation", unit: "W", type: "number", defaultValue: 45 },
        { id: "k", label: "Thermal Conductivity (k)", unit: "W/m·K", type: "number", defaultValue: 3.0, step: "0.1" },
        { id: "pressure", label: "Mounting Pressure", unit: "psi", type: "range", defaultValue: 15, step: "1" },
        { id: "modulus", label: "Elastic Modulus (E)", unit: "psi", type: "number", defaultValue: 150 },
        { id: "hi", label: "Interface Conductance", unit: "W/m²·K", type: "select", defaultValue: 6000, options: [
            { text: "Standard Dry (6000)", value: 6000 },
            { text: "High Pressure/Greased (9000)", value: 9000 },
            { text: "Vacuum De-rated (600)", value: 600 }
        ]}
    ],

    // What to show in the output boxes
    outputs: [
        { id: "t_comp", label: "Compressed t", unit: "mm", decimals: 3 },
        { id: "r_th", label: "Total Resistance", unit: "°C/W", decimals: 4 },
        { id: "delta_t", label: "ΔT", unit: "°C", decimals: 1 }
    ],

    // The Math Engine
    logic: function(vals) {
        const A = (vals.length / 1000) * (vals.width / 1000); // Area in m^2
        const mu = 0.49; // Constant for silicone

        // Mechanical
        let delta_t = (vals.thickness * vals.pressure / vals.modulus) * (1 - 2 * mu);
        let t_comp = vals.thickness - delta_t;
        if (t_comp < vals.thickness * 0.5) t_comp = vals.thickness * 0.5; // Max 50% limit
        
        const t_m = t_comp / 1000; // meters

        // Thermal
        let R_pad = 0;
        let R_contact = 0;
        let R_total = 0;
        let dT = 0;
        let Bi = 0;

        if (vals.k > 0 && vals.hi > 0 && A > 0) {
            R_pad = t_m / (vals.k * A);
            R_contact = 1 / (vals.hi * A);
            R_total = R_pad + (2 * R_contact); // Top and bottom interfaces
            dT = R_total * vals.power;
            Bi = (vals.hi * t_m) / vals.k;
        }

        // Setup Arrays
        const outputs = {
            t_comp: t_comp,
            r_th: R_total,
            delta_t: dT
        };

        const alerts = [];
        
        // Safety Checks
        if (Bi > 0.1) {
            alerts.push({ type: "warning", title: "Biot Number Exception", message: "Bi > 0.1. Internal gradients dominate; 1D assumption losing precision." });
        }
        if (dT > 85) {
            alerts.push({ type: "danger", title: "Junction Temp Warning", message: "Calculated ΔT exceeds standard commercial junction limits (85°C)." });
        }

        return { outputs: outputs, alerts: alerts };
    }
};