// Course content for GT-07 — Axial Turbine.
// All learning outcomes use measurable action verbs. Mirrors the GT-05/06 shape.

export const COURSE_META = {
  id: "gt-07",
  code: "GT-07",
  title: "Axial Turbine — Aerodynamics, Blade Loading & Structural Integrity",
  subtitle: "Small Jet Engine Design Training | Bassam Track | 4.0 hr session",
  org: "ProReadyEngineer",
  durationMin: 240,
  prerequisites: [
    "GT-05 — Centrifugal compressor (P3, T3, ṁ_air)",
    "GT-06 — Combustor (TIT/T04, P04, pattern factor)",
  ],
  topLevelOutcomes: [
    { verb: "Analyse", text: "Analyse velocity-triangle geometry at rotor inlet (Station 1) and exit (Station 2) and apply Euler work to find power extraction." },
    { verb: "Evaluate", text: "Evaluate NGV function in accelerating gas and setting the whirl velocity required for rotor torque." },
    { verb: "Calculate", text: "Calculate radial and tangential disc stresses from the Lamé equations and identify the peak-stress location." },
    { verb: "Compare", text: "Compare open and enclosed rotor architectures on gap losses and rotational speed strength." },
    { verb: "Apply", text: "Apply the '5 thousandths of diameter' tip-clearance rule and explain the dual hot/cold failure modes outside it." },
    { verb: "Justify", text: "Justify a SF ≥ 1.5 on UTS at operating temperature (950 °C for Inconel 713), and distinguish TIT from measured EGT." },
    { verb: "Distinguish", text: "Distinguish impulse, 50%-reaction, and pure-reaction stages by how the static pressure drop is split, and explain why 50% reaction wins for efficiency." },
  ],
};

// Reference engine — 700 N small turbojet, with turbine-specific outputs.
export const REFERENCE_ENGINE = {
  label: "700 N small turbojet — turbine reference (KJ-66 class)",
  thrust_N: 700,
  mDot_kgs: 0.85,
  // Turbine-specific
  D_wheel_mm: 66,           // wheel diameter (KJ-66)
  N_rpm: 115000,            // shaft speed at which Lamé and tip-Mach checks run
  TIT_C: 950,               // turbine inlet temperature (Inconel 713 limit)
  EGT_max_C: 650,           // measured EGT acceptance limit
  vane_count: 23,           // NGV count for KJ-66 class
  work_target_Jkg: 120000,  // target specific work extraction
  psi_target: 0.76,         // stage loading at design point
  phi_typical: 0.5,         // flow coefficient typical
  reaction_design: 0.5,     // 50% reaction
  inconel713_UTS_950C_MPa: 900,
  rho_inconel: 8200,        // kg/m³
  poisson: 0.3,
};

export const SECTIONS = [
  // ─── 1 ────────────────────────────────────────────────────────────────
  {
    id: "s1",
    number: 1,
    title: "Where this session fits — the powerhouse",
    subtitle: "Strategic role of the turbine and prerequisites.",
    outcomes: [
      { verb: "State", text: "State the turbine's primary mission and what 'sustain speed' depends on." },
      { verb: "Recall", text: "Recall the gas state at turbine inlet (T04 / TIT, P04) and why it dictates blade material." },
    ],
    cards: [
      {
        id: "s1-c1",
        heading: "Why the turbine is non-negotiable",
        body: "The turbine is the strategic 'powerhouse' of the engine. Its primary mission is to extract enough energy from the high-temperature gas stream to drive the compressor and all auxiliaries. Without a highly efficient turbine, the engine never reaches 'sustain speed' — the minimum RPM at which the rotor can accelerate under its own power. High-precision matching between turbine output and compressor demand is mandatory; any mismatch means the engine cannot accelerate or surges.",
      },
      {
        id: "s1-c2",
        heading: "Course logic flow",
        body: "Where this session sits between GT-06 and GT-08.",
        bullets: [
          "Foundation — GT-02 Brayton cycle and GT-06 combustion gave you a high-enthalpy gas at T04 (TIT) and P04.",
          "Current — transform thermal energy into mechanical shaft power. Aerodynamic profiles to harness gas momentum AND structural integrity to survive centrifugal + thermal loads.",
          "Next — exit conditions (residual P, T) feed into GT-08 (Converging Nozzle), where remaining enthalpy becomes high-velocity jet thrust.",
          "This is where 'gas turbine' becomes 'jet engine'.",
        ],
      },
      {
        id: "s1-c3",
        heading: "Combustion exit state (what the turbine receives)",
        body: "Gas enters the turbine at maximum cycle temperature TIT (T04) and total pressure P04.",
        bullets: [
          "For KJ-66 class engines TIT ≈ 950 °C — limited by the creep-rupture strength of the turbine wheel material (Inconel 713).",
          "Reverse-compressor function: compressor adds work to gas; turbine extracts it.",
          "Energy extraction begins at the stationary Nozzle Guide Vanes (NGVs) and concludes at the rotating turbine blades on the common shaft with the compressor.",
        ],
      },
    ],
    probes: [
      {
        id: "s1-p1",
        type: "mcq",
        kind: "concept",
        stem: "The turbine's primary mission in a single-shaft turbojet is to:",
        options: [
          "Generate jet thrust directly",
          "Extract enough energy from the hot gas to drive the compressor (and reach sustain speed)",
          "Cool the combustor exit gas",
          "Add work to the gas",
        ],
        correct: 1,
        explain: "The turbine's job is shaft power: extracting enough energy from the hot gas to drive the compressor and any auxiliaries. Thrust is produced downstream in the nozzle (GT-08). Cooling and adding work are not turbine functions.",
      },
      {
        id: "s1-p2",
        type: "mcq",
        kind: "application",
        stem: "Why does TIT for a KJ-66-class engine sit at ~950 °C and not higher?",
        options: [
          "It's the compressor's stall margin",
          "950 °C is the creep-rupture limit of uncooled Inconel 713 — go hotter and the turbine wheel deforms under load",
          "Above this the fuel won't burn",
          "Pressure-drop in the combustor caps it",
        ],
        correct: 1,
        explain: "TIT is bounded by material creep at the turbine wheel. Inconel 713 is the typical small-engine material with ~950 °C continuous limit. Adding cooling (film, internal passages) would extend it, but at small scale the rotor is uncooled — TIT is the temperature it actually sees.",
      },
    ],
  },

  // ─── 2 ────────────────────────────────────────────────────────────────
  {
    id: "s2",
    number: 2,
    title: "NGV and rotor function",
    subtitle: "A two-part energy extraction process.",
    outcomes: [
      { verb: "Describe", text: "Describe what the NGV does and why it is the first part to encounter TIT." },
      { verb: "Distinguish", text: "Distinguish impulse, 50% reaction, and pure-reaction stages by how the static pressure drop is split." },
      { verb: "Compare", text: "Compare open vs enclosed rotor architectures on RPM strength and gap losses." },
    ],
    cards: [
      {
        id: "s2-c1",
        heading: "What the NGV does",
        body: "The Nozzle Guide Vane (NGV) is a stationary first row that converts pressure energy into kinetic energy.",
        bullets: [
          "Accelerates gas to high velocity (often near sonic at the throat).",
          "Twists the flow to a specific angle, creating an impulse force the rotor can extract.",
          "Hits gas at MAXIMUM TIT — so the NGV must be the hottest-rated material in the engine (Inconel 713 for KJ-66 class).",
        ],
      },
      {
        id: "s2-c2",
        heading: "What the rotor does",
        body: "The rotor receives the high-velocity gas at the angle set by the NGV.",
        bullets: [
          "As gas flows through rotor blades, it is accelerated in the direction opposite to rotation, creating a 'recoil' force.",
          "This recoil is the torque that drives the compressor through the shaft.",
          "For the standard zero-exit-swirl design: gas exits the rotor purely axially. Any tangential velocity at exit is wasted kinetic energy.",
        ],
      },
      {
        id: "s2-c3",
        heading: "Pressure-drop families",
        body: "Three stage architectures based on how the static pressure drops are distributed.",
        bullets: [
          "Impulse profile (R = 0) — pressure drop occurs almost exclusively in the NGV; rotor only redirects flow.",
          "Reaction profile (R > 0) — pressure drop is shared between NGV and rotor.",
          "50% reaction (R = 0.5) — split evenly. Professional standard for efficiency at this scale.",
          "Modern small turbojets typically use 50% reaction or near-50% for balanced loading.",
        ],
      },
      {
        id: "s2-c4",
        heading: "Open vs enclosed rotors",
        body: "A structural trade-off.",
        bullets: [
          "Open (bladed) rotors — blades on a hub, open tips. Highest rotational speed strength.",
          "Enclosed (shrouded) rotors — shroud connects all tips, eliminating gap losses but adding mass at high radius.",
          "Trade: the shroud's centrifugal stress lowers allowable RPM.",
          "For high-RPM small turbojets (>100,000 RPM), open rotors dominate.",
        ],
      },
    ],
    probes: [
      {
        id: "s2-p1",
        type: "mcq",
        kind: "concept",
        stem: "Which component first encounters the maximum gas temperature (TIT) in the turbine?",
        options: [
          "The rotor blade",
          "The NGV (stationary nozzle guide vanes)",
          "The shaft",
          "The combustor liner",
        ],
        correct: 1,
        explain: "The NGV is the FIRST row the combustor exhaust hits — it sees the full TIT. That's why NGV material (Inconel 713) must be rated for the highest temperature in the engine. Rotor blades see slightly lower temperatures because the NGV has done some pressure → kinetic conversion before them.",
      },
      {
        id: "s2-p2",
        type: "mcq",
        kind: "evaluation",
        stem: "Why is 50% reaction the professional standard for high-efficiency small turbines?",
        options: [
          "Easier to manufacture",
          "Balances pressure drop equally between stator and rotor, giving favourable gradients in both, with symmetric velocity triangles → similar manufacturing for both blade rows",
          "Reduces TIT",
          "Eliminates the need for cooling",
        ],
        correct: 1,
        explain: "50% reaction splits the static-pressure drop evenly between NGV and rotor. That gives favourable (decelerating-pressure) gradients across both rows, minimising boundary-layer separation losses. The symmetric velocity triangles are a manufacturing bonus, not the reason.",
      },
      {
        id: "s2-p3",
        type: "mcq",
        kind: "analysis",
        stem: "An enclosed (shrouded) rotor eliminates tip-gap losses. Why isn't it used for >100,000 RPM small turbojets?",
        options: [
          "The shroud blocks airflow",
          "The shroud adds mass at high radius → centrifugal stress on the shroud caps allowable RPM",
          "It costs more to manufacture",
          "Shrouds prevent gas from entering the rotor",
        ],
        correct: 1,
        explain: "Centrifugal stress scales with ρ·ω²·r². A shroud ring at the maximum radius adds mass at the worst possible location, and that mass has to be carried by the blades. At hobby-class RPM the shroud fails before the open-bladed alternative. Solution: live with tip-gap losses, use open rotors, and budget cleanly.",
      },
    ],
  },

  // ─── 3 ────────────────────────────────────────────────────────────────
  {
    id: "s3",
    number: 3,
    title: "Velocity triangles",
    subtitle: "Three vectors per station, two stations per stage.",
    outcomes: [
      { verb: "Define", text: "Define the absolute (C), blade (U), and relative (W) velocity vectors and their vector relation." },
      { verb: "Construct", text: "Construct rotor inlet and exit velocity triangles for a given α1 and a zero-exit-swirl target." },
      { verb: "Justify", text: "Justify zero exit swirl (Cw2 = 0) as the efficiency target at design point." },
    ],
    cards: [
      {
        id: "s3-c1",
        heading: "Three vectors",
        body: "The geometry of a single station.",
        bullets: [
          "Absolute velocity C — speed of the gas relative to the stationary casing.",
          "Blade speed U — tangential speed of the rotating blade at the mean radius.",
          "Relative velocity W — speed of the gas as seen by the moving blade.",
          "Vector relation: W = C − U. Bridges the rotating and stationary frames.",
        ],
      },
      {
        id: "s3-c2",
        heading: "Inlet triangle (Station 1, after NGV)",
        body: "At rotor inlet, C1 has been accelerated by the NGV and is angled tangentially.",
        bullets: [
          "U at mean radius — typically 235 m/s for a 35 mm wheel at 80 000 RPM; ~397 m/s for the KJ-66 at 115 000 RPM.",
          "W1 = C1 − U: relative velocity that the rotor blade actually sees.",
          "β1 = atan(Wt1 / Wa1): relative flow angle, sets the rotor blade leading-edge angle.",
        ],
      },
      {
        id: "s3-c3",
        heading: "Exit triangle (Station 2, after rotor)",
        body: "At rotor exit we want zero exit swirl — Cw2 = 0.",
        bullets: [
          "C2 = Ca2 only (purely axial). This minimises wasted kinetic energy.",
          "W2 has a negative tangential component (the blade has turned the relative flow back toward axial in the rotating frame).",
          "β2 sets the rotor blade trailing-edge angle.",
          "Symmetry between inlet and exit indicates 50% reaction.",
        ],
      },
      {
        id: "s3-c4",
        heading: "Why zero exit swirl",
        body: "Any tangential velocity at rotor exit (Cw2 ≠ 0) is unused kinetic energy that carries downstream and is lost to the nozzle exhaust. For maximum stage efficiency drive Cw2 → 0 at design point. Off-design Cw2 ≠ 0 is unavoidable — but the design point is where we optimise.",
      },
      {
        id: "s3-c5",
        heading: "Rothalpy — the rotor's conservation law",
        body: "Across the rotor, the rotor-frame quantity h + W²/2 − U²/2 (rothalpy) is constant. It's the rotating-frame analogue of stagnation enthalpy in the stationary frame.",
        bullets: [
          "h1 + W1²/2 − U1²/2 = h2 + W2²/2 − U2²/2.",
          "For an axial turbine U1 = U2 at mean radius, so rothalpy reduces to the usual rotor energy balance.",
          "In radial machines U changes from inlet to exit and the full rothalpy equation matters.",
        ],
      },
    ],
    probes: [
      {
        id: "s3-p1",
        type: "mcq",
        kind: "application",
        stem: "Wheel diameter D = 66 mm, shaft speed N = 115 000 rpm. What is the mean blade speed U?",
        options: [
          "≈ 199 m/s",
          "≈ 397 m/s",
          "≈ 798 m/s",
          "≈ 132 m/s",
        ],
        correct: 1,
        explain: "U = π·D·N/60 = π·0.066·(115 000/60) ≈ 397 m/s. That's roughly Mach 1.17 in cold air — typical KJ-66 rim speed. At smaller wheels or lower RPM the value scales linearly.",
      },
      {
        id: "s3-p2",
        type: "mcq",
        kind: "concept",
        stem: "The vector relation between the absolute (C), blade (U), and relative (W) velocities is:",
        options: [
          "C = U + W",
          "W = C − U",
          "U = C + W",
          "All three: C = U + W, W = C − U, U = C − W",
        ],
        correct: 3,
        explain: "All three statements are equivalent rearrangements of the same vector triangle. Most textbooks state W = C − U because that's the form you use to find the relative flow vector (what the blade sees) from given absolute flow C and known blade speed U.",
      },
      {
        id: "s3-p3",
        type: "mcq",
        kind: "evaluation",
        stem: "An engine is tested with significant whirl at the rotor exit (Cw2 ≈ 60 m/s, design target was Cw2 = 0). What's the consequence?",
        options: [
          "Higher stage efficiency than design",
          "Wasted kinetic energy — ½·ρ·Cw2² of axial-direction energy is carried out instead of being extracted; stage efficiency drops",
          "Compressor surge",
          "Combustor flameout",
        ],
        correct: 1,
        explain: "Any tangential velocity at rotor exit IS unused energy. The downstream nozzle can convert axial KE into thrust but not the swirl component. The result is reduced stage work and lower thrust for the same fuel flow. Off-design conditions inevitably leak some swirl; the goal is to keep it small at the design point.",
      },
    ],
  },

  // ─── 4 ────────────────────────────────────────────────────────────────
  {
    id: "s4",
    number: 4,
    title: "Blade loading and flow coefficients",
    subtitle: "Three dimensionless numbers that define the stage.",
    outcomes: [
      { verb: "Apply", text: "Apply ψ = ΔCw / U to compute stage loading from velocity-triangle outputs." },
      { verb: "Apply", text: "Apply φ = Ca / U and the relation ṁ = ρ·Ca·A to size the annulus area." },
      { verb: "Distinguish", text: "Distinguish R = 0, R = 0.5, and R = 1 stages by how the static pressure drop is split." },
    ],
    cards: [
      {
        id: "s4-c1",
        heading: "Stage loading coefficient ψ",
        body: "How much work per U². ψ = w / U² = ΔCw / U.",
        bullets: [
          "Represents the work done per unit of (blade speed)².",
          "High ψ → more power per stage but risk of flow separation.",
          "Reference (KJ-66 at 115 000 rpm with w = 120 kJ/kg): ψ ≈ 120 000 / 397² ≈ 0.76 — moderate loading, balanced for efficiency.",
          "Typical small-turbojet range: ψ = 0.7–1.5.",
        ],
      },
      {
        id: "s4-c2",
        heading: "Flow coefficient φ",
        body: "Axial velocity versus blade speed. φ = Ca / U.",
        bullets: [
          "Ca is the axial-direction velocity used for the mass-flow rate calculation: ṁ = ρ·Ca·A_annulus = ρ·φ·U·A_annulus.",
          "Choosing φ sets the annulus area for a given mass-flow target.",
          "Low φ → blades 'overloaded' tangentially → separation risk.",
          "High φ → blades 'unloaded' tangentially → less work per stage.",
          "Typical small turbines: φ = 0.4–0.6.",
        ],
      },
      {
        id: "s4-c3",
        heading: "Degree of reaction R",
        body: "How the static enthalpy (pressure) drop is split between the stator and rotor.",
        bullets: [
          "R = static-enthalpy drop in rotor / total stage drop.",
          "R = 0: impulse turbine — all static drop in the NGV; rotor only redirects flow.",
          "R = 0.5: 50% reaction — equal split; symmetric velocity triangles.",
          "R = 1: pure reaction — all static drop in rotor (rare in practice).",
        ],
      },
      {
        id: "s4-c4",
        heading: "Why 50% reaction wins",
        body: "The professional standard.",
        bullets: [
          "Balancing the pressure drop equally between stator and rotor gives favourable decelerating gradients across BOTH rows.",
          "Minimises aerodynamic loss (boundary-layer separation) across the stage.",
          "Symmetric velocity triangles → similar blade geometries → similar manufacturing for stator and rotor.",
        ],
      },
      {
        id: "s4-c5",
        heading: "Turbine performance map vs compressor",
        body: "Turbines have characteristic maps too, but with key differences from compressors.",
        bullets: [
          "No surge phenomenon — turbines run with a FAVOURABLE pressure gradient (flow moves with ΔP).",
          "Choke is still the operating limit (sonic at some throat).",
          "Characteristic curve is a WEAKER function of speed than the compressor.",
          "Mass-flow function ṁ·√T01/P01 vs P01/P02 collapses to a near-constant curve once choked.",
        ],
      },
    ],
    probes: [
      {
        id: "s4-p1",
        type: "mcq",
        kind: "application",
        stem: "Required stage work w = 100 kJ/kg, mean blade speed U = 350 m/s. What is the stage loading coefficient ψ?",
        options: [
          "ψ ≈ 0.36",
          "ψ ≈ 0.82",
          "ψ ≈ 1.4",
          "ψ ≈ 2.0",
        ],
        correct: 1,
        explain: "ψ = w / U² = 100 000 / 350² = 100 000 / 122 500 ≈ 0.82. Within the typical 0.7–1.5 small-turbine band. Higher ψ → more work per stage but higher separation risk.",
      },
      {
        id: "s4-p2",
        type: "mcq",
        kind: "concept",
        stem: "Unlike compressor maps, turbine performance maps DO NOT show:",
        options: [
          "A surge line",
          "A choke line",
          "Speed lines",
          "Pressure ratio",
        ],
        correct: 0,
        explain: "Turbines work with a FAVOURABLE pressure gradient — flow always moves from high to low pressure — so there's no surge mechanism. Choke (sonic at a throat) is still a hard limit, and speed lines and PR are still plotted. The map is a weaker function of speed than the compressor's.",
      },
      {
        id: "s4-p3",
        type: "mcq",
        kind: "analysis",
        stem: "A stage is described as R = 0 (impulse). What does that mean physically?",
        options: [
          "The rotor extracts no work",
          "All the static-pressure drop happens in the NGV; the rotor changes flow direction at constant static pressure",
          "There is no NGV, just a rotor",
          "Flow accelerates only in the rotor",
        ],
        correct: 1,
        explain: "Impulse (R = 0): NGV absorbs ALL the static drop, sending high-velocity gas into the rotor. The rotor's job is to turn the flow (changing tangential momentum) without further pressure drop. Work is still extracted via the change in whirl velocity. Used in some specialty applications; the typical KJ-66 class runs at ~50% reaction.",
      },
    ],
  },

  // ─── 5 ────────────────────────────────────────────────────────────────
  {
    id: "s5",
    number: 5,
    title: "Governing equations and structural analysis",
    subtitle: "Mathematical rigor against catastrophic failure.",
    outcomes: [
      { verb: "Apply", text: "Apply the Lamé equations to find radial and tangential stress in a rotating disc and identify where stress peaks." },
      { verb: "Calculate", text: "Calculate safety factor SF = UTS / σ_max at OPERATING temperature, and assess against the SF ≥ 1.5 rule." },
      { verb: "Justify", text: "Justify the '1 cm shaft length = −20% RPM strength' rule from first-bending-mode dependence on length." },
      { verb: "Interpret", text: "Interpret a Campbell diagram and identify forbidden RPM crossings." },
    ],
    cards: [
      {
        id: "s5-c1",
        heading: "Lamé equations — disc stress",
        body: "For a rotating thin disc, radial (σ_r) and tangential (σ_θ) stresses follow Lamé.",
        bullets: [
          "σ_r = (3 + ν)/8 · ρ · ω² · (R_outer² − r²)",
          "σ_θ = (3 + ν)/8 · ρ · ω² · (R_outer² − ((1 + 3ν)/(3 + ν))·r²)",
          "ρ = density (kg/m³), ω = angular velocity (rad/s), ν = Poisson's ratio.",
          "Identifies burst speed; stress is maximum at the centre (bore) and dictates disc thickness.",
        ],
      },
      {
        id: "s5-c2",
        heading: "Where stress peaks — counterintuitive but critical",
        body: "Centrifugal stress peaks at the BORE (smallest radius) of the disc, NOT at the rim where you might expect.",
        bullets: [
          "Reason: σ_θ is maximised at r = 0 according to Lamé.",
          "Implication: the disc bore is the structural critical point — design must add mass and thickness there.",
          "On a real FEA with blades attached, peak stress moves to the blade footing because of fillet radii and stress concentration; the disc-only Lamé prediction stays at the bore.",
        ],
      },
      {
        id: "s5-c3",
        heading: "Shaft strength — the 1 cm rule",
        body: "Every 1 cm of additional shaft length reduces the rotational speed strength by up to 20%.",
        bullets: [
          "Reason: the first bending natural frequency of the shaft drops sharply with length (roughly 1/L²).",
          "At our RPM range, the first bending mode must stay ABOVE the operating speed.",
          "Practical: keep the shaft tunnel as short as possible — engine is 'short and fat'.",
          "A 2 cm extension can cost 40% of allowable RPM. Any shaft-length change requires a fresh critical-speed analysis.",
        ],
      },
      {
        id: "s5-c4",
        heading: "Safety factor — SF ≥ 1.5",
        body: "The pass/fail criterion for rotating parts.",
        bullets: [
          "SF = UTS / σ_max ≥ 1.5 for all rotating parts.",
          "Margin MUST be calculated at OPERATING TEMPERATURE (950 °C), not room temperature.",
          "Inconel 713: ~900 MPa yield at 950 °C vs ~1100 MPa at room T.",
          "Example: if σ_max = 600 MPa at 950 °C → SF = 900/600 = 1.5 — barely acceptable.",
        ],
      },
      {
        id: "s5-c5",
        heading: "Sanity check across numbers",
        body: "Do the equations hang together for the KJ-66 reference?",
        bullets: [
          "For 397 m/s tip speed and 120 kJ/kg work: ψ = 120 000 / 397² ≈ 0.76.",
          "For 0.85 kg/s mass flow: P_turbine ≈ ṁ·w ≈ 102 kW (well above ~50 kW compressor demand → margin for thrust).",
          "Lamé at 115 000 RPM, R_outer = 35 mm, R_bore = 6 mm, ν = 0.3, ρ = 8200 kg/m³: σ_θ_bore ≈ 600 MPa.",
          "Inconel 713 at 950 °C UTS ≈ 900 MPa → SF = 900/600 = 1.5 ✓",
          "All numbers internally consistent. Design is structurally feasible.",
        ],
      },
      {
        id: "s5-c6",
        heading: "Campbell diagrams — HCF and vibration",
        body: "Campbell plots natural frequency vs RPM with engine-order lines superimposed.",
        bullets: [
          "Natural frequency — the frequency at which a structure rings freely (set by mass + stiffness). Independent of RPM.",
          "Natural mode — the shape it deforms in (shaft bending, disc umbrella, blade torsion). Identified by modal FEA or test.",
          "Engine-order excitation — N (1×), 2N, 3N, … harmonics of rotor speed.",
          "Acceptance: no engine-order line should cross a natural frequency at the operating RPM. Crossings cause HCF (high-cycle fatigue) and blade shedding.",
        ],
      },
    ],
    probes: [
      {
        id: "s5-p1",
        type: "mcq",
        kind: "concept",
        stem: "Where in a thin rotating disc is the tangential (hoop) stress σ_θ MAXIMUM, according to Lamé?",
        options: [
          "At the rim (outer radius)",
          "At the bore (smallest radius, r → 0)",
          "At the mean radius",
          "Uniform — stress is the same everywhere",
        ],
        correct: 1,
        explain: "σ_θ = (3+ν)/8·ρ·ω²·(R_outer² − ((1+3ν)/(3+ν))·r²) — the coefficient on r² is positive and less than 1, so σ_θ shrinks with increasing r. Maximum is at r = 0 (the bore). That's why the disc must be thickened around the centre, even though intuition says 'rim = highest speed = highest stress.'",
      },
      {
        id: "s5-p2",
        type: "mcq",
        kind: "evaluation",
        stem: "An engine's shaft is increased in length from 10 cm to 12 cm. Approximately how much rotational speed strength does the engine lose?",
        options: [
          "0% — shaft length is irrelevant",
          "~5%",
          "~20% — about per cm × 1",
          "~40% — ~20% per cm × 2",
        ],
        correct: 3,
        explain: "Rule of thumb: 1 cm extension ≈ 20% rotational speed strength loss. A 2 cm extension stacks linearly to ~40%. Practically the engine may no longer reach its design RPM at all. Every shaft-length change requires a fresh critical-speed analysis (first bending mode must stay above operating speed).",
      },
      {
        id: "s5-p3",
        type: "mcq",
        kind: "application",
        stem: "Inconel 713 yields at 800 MPa at 950 °C. What is the maximum allowable σ_max for SF = 1.5?",
        options: [
          "≈ 1200 MPa",
          "≈ 533 MPa",
          "≈ 800 MPa",
          "≈ 320 MPa",
        ],
        correct: 1,
        explain: "SF = UTS / σ_max → σ_max = UTS / SF = 800 / 1.5 ≈ 533 MPa. The design must keep the worst-case (bore) stress below this. Note: yield strength at OPERATING temperature is the right number — not the room-temperature figure.",
      },
      {
        id: "s5-p4",
        type: "mcq",
        kind: "concept",
        stem: "A Campbell diagram shows the first blade-torsion natural frequency at 5400 Hz crossing the 4× engine-order line at 81 000 RPM. The engine operates at 80 000 RPM. What is the concern?",
        options: [
          "None — 81k > 80k, the crossing is above operating speed",
          "Resonance occurs at 81 000 RPM, which is dangerously close to operating; the engine could pass through it during start, throttle changes, or wind-milling — high-cycle fatigue risk",
          "The shaft is too short",
          "Compressor surge",
        ],
        correct: 1,
        explain: "Operating speeds frequently pass through nearby Campbell crossings during start-up, throttle transients, and shutdown. Even a brief dwell at a resonance can cause cumulative HCF damage on the blades. Acceptance demands enough margin (typically 10–15%) between operating speed and any crossing.",
      },
    ],
  },

  // ─── 6 ────────────────────────────────────────────────────────────────
  {
    id: "s6",
    number: 6,
    title: "Design and analysis workflow",
    subtitle: "Seven steps from spec to safety check.",
    outcomes: [
      { verb: "Outline", text: "Outline the 7-step design loop from aerodynamic definition through verification." },
      { verb: "Justify", text: "Justify the inevitability of 3–5 iterations before all aero + structural checks close." },
    ],
    cards: [
      {
        id: "s6-c1",
        heading: "Steps 1–3 — aerodynamic definition",
        body: "First half of the loop.",
        bullets: [
          "Step 1 — Shaft-power mapping: required shaft power from the compressor (>20 kW for a 66 mm wheel at full throttle).",
          "Step 2 — Initial parameter selection: target ψ and φ from small-engine benchmarks.",
          "Step 3 — Velocity-vector construction: inlet/exit triangles → required gas angles.",
        ],
      },
      {
        id: "s6-c2",
        heading: "Steps 4–5 — blade and disc design",
        body: "Aero translated into hardware.",
        bullets: [
          "Step 4 — Blade-profile definition: pick a vane count (23 is the KJ-66 standard) and determine reaction vs impulse geometry.",
          "Step 5 — Structural sizing: apply Lamé equations to size the disc and blade roots.",
        ],
      },
      {
        id: "s6-c3",
        heading: "Steps 6–7 — verification",
        body: "Safety checks before manufacturing.",
        bullets: [
          "Step 6 — Safety verification: SF ≥ 1.5 at TIT limits (950 °C for Inconel 713).",
          "Step 7 — Dynamic analysis: check HCF (vibration / Campbell diagram) and LCF (start-stop cycles).",
          "Iterate any failed step. Most designs require 3–5 iterations before all checks pass.",
        ],
      },
      {
        id: "s6-c4",
        heading: "Why iteration is inevitable",
        body: "The aero-mech feedback loop.",
        bullets: [
          "Iter 1: aero designer sets U, T01, P01 → preliminary blade size.",
          "Iter 2: mech designer checks disc stress (Lamé + FEA). Often fails first pass.",
          "Iter 3: change material or reduce RPM. Recheck aero — work demand often not met.",
          "Iter 4: increase blade size to compensate. Recheck disc stress with new geometry.",
          "Document each iteration — required for certification (audit trail).",
        ],
      },
    ],
    probes: [
      {
        id: "s6-p1",
        type: "mcq",
        kind: "concept",
        stem: "Which step in the design workflow finds the REQUIRED whirl velocity Cw1?",
        options: [
          "Step 1 — Shaft-power mapping",
          "Step 3 — Velocity-vector construction (after target ψ and φ are picked)",
          "Step 5 — Structural sizing",
          "Step 7 — Dynamic analysis",
        ],
        correct: 1,
        explain: "Step 3 is where you build the velocity triangles using the chosen ψ and φ, blade speed U (from RPM and wheel diameter), and the work demand from Step 1. Cw1 follows from ψ · U, and α1 from atan(Cw1 / Ca).",
      },
      {
        id: "s6-p2",
        type: "mcq",
        kind: "evaluation",
        stem: "After iteration 2 the disc fails its SF ≥ 1.5 check at 115 000 RPM. What is the right next move?",
        options: [
          "Switch to a different fuel",
          "Reduce RPM or upgrade material; then re-run the aero side to confirm work demand still met (often requires larger blade)",
          "Increase shaft length to spread the load",
          "Ignore — small-engine standards are looser",
        ],
        correct: 1,
        explain: "Failing structurally means either σ_max is too high (drop RPM, which drops σ ∝ ω²) or UTS is too low (upgrade material). Both changes ripple back to the aero side — lower RPM means lower U means more blade required to make the same work. That's why the loop is iterative.",
      },
    ],
  },

  // ─── 7 ────────────────────────────────────────────────────────────────
  {
    id: "s7",
    number: 7,
    title: "Worked example — KJ-66 turbine sizing",
    subtitle: "Concrete numbers for a real engine.",
    outcomes: [
      { verb: "Calculate", text: "Calculate blade speed U and required whirl Cw1 from RPM, diameter, and work demand." },
      { verb: "Verify", text: "Verify stage loading ψ sits in the safe band (0.7–1.5) and structural SF ≥ 1.5 at operating temperature." },
    ],
    cards: [
      {
        id: "s7-c1",
        heading: "Step 1 — blade speed",
        body: "From RPM to U.",
        bullets: [
          "Inputs: D = 66 mm (0.066 m), N = 115 000 RPM, vane count = 23.",
          "U = π · D · N / 60 = π · 0.066 · 115 000 / 60 ≈ 397.4 m/s.",
          "Sanity: 397 m/s × 3.6 ≈ 1430 km/h — supersonic-equivalent ground speed at the rim.",
        ],
      },
      {
        id: "s7-c2",
        heading: "Step 2 — required whirl velocity",
        body: "From work demand to Cw1.",
        bullets: [
          "Compressor power requirement → target work extraction w = 120 000 J/kg.",
          "From w = U · Cw1 (zero exit swirl, ΔCw = Cw1): Cw1 = w / U = 120 000 / 397.4 ≈ 301.9 m/s.",
          "This is the whirl velocity the NGV must impart to the gas before the rotor sees it.",
          "NGV exit angle α1 = atan(Cw1 / Ca) — typically 60–75° for this whirl.",
        ],
      },
      {
        id: "s7-c3",
        heading: "Step 3 — stage loading",
        body: "Dimensionless check.",
        bullets: [
          "ψ = Cw1 / U = 301.9 / 397.4 ≈ 0.76.",
          "Moderate loading — within the typical small-turbojet range (0.7–1.5).",
          "At this ψ, stage efficiency typically peaks around 88–90%.",
          "If ψ > 1.5: stage is overloaded → separation, drop work target or split into more stages.",
        ],
      },
      {
        id: "s7-c4",
        heading: "Step 4 — structural margin",
        body: "Pass / fail.",
        bullets: [
          "At 115 000 RPM with Inconel 713 disc (R_outer = 35 mm, R_bore = 6 mm, ρ = 8200 kg/m³, ν = 0.3): σ_θ,bore ≈ 600 MPa.",
          "Inconel 713 at 950 °C UTS ≈ 900 MPa.",
          "SF = 900 / 600 = 1.5 — meets the SF ≥ 1.5 professional safety standard.",
          "Status: design meets professional safety standards. Sanity-check vibration on a Campbell diagram before manufacturing.",
        ],
      },
    ],
    probes: [
      {
        id: "s7-p1",
        type: "mcq",
        kind: "application",
        stem: "Required work w = 120 kJ/kg at U = 397 m/s with zero exit swirl. What whirl velocity must the NGV deliver?",
        options: [
          "Cw1 ≈ 100 m/s",
          "Cw1 ≈ 302 m/s",
          "Cw1 ≈ 500 m/s",
          "Cw1 ≈ 397 m/s",
        ],
        correct: 1,
        explain: "Cw1 = w / U = 120 000 / 397 ≈ 302 m/s. The NGV must accelerate and turn the gas to deliver this whirl component at rotor inlet. α1 = atan(Cw1/Ca) — for Ca around 150 m/s that's around 64°.",
      },
      {
        id: "s7-p2",
        type: "mcq",
        kind: "evaluation",
        stem: "For the KJ-66 worked example we got ψ ≈ 0.76 and SF = 1.5. What's the right conclusion?",
        options: [
          "Both numbers are borderline; redesign immediately",
          "Both are in the acceptable band — aero loading moderate (0.7–1.5 range) and structural margin meets SF ≥ 1.5. Cleared for next-step verification (Campbell, cold-flow rig).",
          "ψ is too low — increase to 1.5",
          "Inconel 713 is wrong — switch to titanium",
        ],
        correct: 1,
        explain: "ψ = 0.76 sits in the moderate loading band where efficiency typically peaks. SF = 1.5 is exactly the professional floor — it's tight but acceptable for an uncooled small-engine design. Further verification (Campbell crossings, vibration, rig test) is the next step, not redesign.",
      },
    ],
  },

  // ─── 8 ────────────────────────────────────────────────────────────────
  {
    id: "s8",
    number: 8,
    title: "Practical engineering checks",
    subtitle: "Acceptance criteria during assembly and testing.",
    outcomes: [
      { verb: "Apply", text: "Apply the '5 thousandths of D' tip-clearance rule and the dual failure modes outside it." },
      { verb: "Distinguish", text: "Distinguish measured EGT from inferred TIT and avoid the common confusion." },
      { verb: "Diagnose", text: "Diagnose vibration symptoms using a Campbell diagram and run-out check." },
    ],
    cards: [
      {
        id: "s8-c1",
        heading: "Gap losses — the 5 thousandths of D rule",
        body: "Tip clearance scales with wheel diameter.",
        bullets: [
          "Acceptance metric: tip gap ≈ 0.005 × D (5 thousandths of diameter). For a 66 mm wheel that's 0.33 mm.",
          "Range: 0.3–0.5 mm cold for our class.",
          "Below this: thermal jam risk on start-up (rotor heats faster than housing → rotor rubs).",
          "Above ~1.0 mm: engine refuses to run — efficiency drop is too severe.",
          "Warning sign: excessive EGT, low thrust.",
        ],
      },
      {
        id: "s8-c2",
        heading: "Thermal limits — EGT ≈ 650 °C max",
        body: "Max EGT 650 °C → inferred TIT 950 °C.",
        bullets: [
          "Acceptance: EGT ≤ 650 °C measured at the tail cone (where gas has expanded and cooled).",
          "TIT is much hotter than EGT and is rarely instrumented directly — no sensor survives long-term at TIT.",
          "Infer TIT from EGT + cycle deck. Typical offset: TIT is 200–300 °C hotter than measured EGT.",
          "Warning signs: blade creep (visible stretching), blades glowing bright orange/red on shutdown.",
        ],
      },
      {
        id: "s8-c3",
        heading: "Vibration — Campbell diagram check",
        body: "Resonance avoidance.",
        bullets: [
          "Acceptance: shaft run-out < 0.01 mm; Campbell diagram shows no engine-order line crossing any natural frequency AT the operating RPM.",
          "Run-out checked with dial indicator on the shaft.",
          "Campbell diagram from FEA modal analysis.",
          "Warning signs: resonance at operating RPM, high-frequency 'scream,' blade shedding.",
        ],
      },
      {
        id: "s8-c4",
        heading: "Throttle state — above sustain speed",
        body: "The minimum stable RPM.",
        bullets: [
          "Acceptance: engine must stay above 'sustain speed' — minimum RPM at which the rotor self-accelerates.",
          "Reference engine: sustain speed ≈ 25–30% of design RPM.",
          "Warning signs: white smoke, lazy acceleration, EGT spike → meltdown.",
          "Recovery: cool engine, identify cause (fuel scheduling, air leak), fix before retest.",
        ],
      },
    ],
    probes: [
      {
        id: "s8-p1",
        type: "mcq",
        kind: "application",
        stem: "What is the target tip clearance for a 70 mm turbine wheel per the 0.005 × D rule?",
        options: [
          "0.05 mm",
          "0.35 mm (within the 0.3–0.5 mm band)",
          "1.4 mm",
          "0.005 mm",
        ],
        correct: 1,
        explain: "0.005 × 70 mm = 0.35 mm. Falls neatly within the 0.3–0.5 mm acceptance window. Below 0.3 mm is jam risk on thermal expansion; above 1.0 mm and the engine won't run.",
      },
      {
        id: "s8-p2",
        type: "mcq",
        kind: "concept",
        stem: "A thermocouple reads EGT = 600 °C at the tail cone. What is the BEST estimate of TIT?",
        options: [
          "600 °C — same as EGT",
          "Roughly 800–900 °C — 200–300 °C hotter than EGT because gas has expanded and cooled between turbine inlet and exhaust",
          "Below EGT — TIT is always cooler",
          "Cannot be inferred from EGT",
        ],
        correct: 1,
        explain: "TIT (turbine inlet temperature) is the gas temperature BEFORE the turbine extracts work; EGT is measured AFTER the turbine and nozzle have cooled the gas. The cycle deck gives the offset — typically 200–300 °C. For EGT = 600 °C, TIT is in the 800–900 °C range — within the Inconel 713 limit.",
      },
      {
        id: "s8-p3",
        type: "mcq",
        kind: "evaluation",
        stem: "An engine refuses to accelerate past 25% RPM and produces white smoke. The most likely cause is:",
        options: [
          "Compressor surge",
          "Engine is below sustain speed — adding fuel below the self-accelerating threshold over-fuels the combustor, producing unburnt fuel (white smoke) and risking hot start",
          "Bearing failure",
          "Pump cavitation",
        ],
        correct: 1,
        explain: "Sustain speed is the minimum RPM where turbine power exceeds compressor demand + friction. Below it, more fuel just over-fuels the combustor (rich pockets → white smoke = unburnt vapour). Recovery: cool engine, check fuel scheduling and air leaks, never just throw more fuel at it.",
      },
    ],
  },

  // ─── 9 ────────────────────────────────────────────────────────────────
  {
    id: "s9",
    number: 9,
    title: "Common mistakes and misconceptions",
    subtitle: "Four traps that destroy hardware.",
    outcomes: [
      { verb: "Discriminate", text: "Discriminate myth from reality on sustain-speed throttling, hobby-scale gap rules, EGT-vs-TIT, and shaft-length effects." },
    ],
    cards: [
      {
        id: "s9-c1",
        heading: "Trap 1 — ignoring sustain speed",
        body: "Don't open the throttle too early.",
        bullets: [
          "Mistake: attempting to open the throttle before the engine reaches its self-sustaining RPM.",
          "Below sustain speed the engine CANNOT accelerate even with more fuel.",
          "Adding fuel below sustain speed → over-fueling → hot-start damage.",
          "Correction: wait for the engine to reach idle (typically 30–40% RPM) before throttle advance.",
        ],
      },
      {
        id: "s9-c2",
        heading: "Trap 2 — the scaling fallacy",
        body: "Air molecules don't shrink with your engine.",
        bullets: [
          "Mistake: assuming hobby-engine performance scales linearly from textbook examples.",
          "Reality: small engines suffer disproportionately from gap losses — Reynolds number drops with chord, boundary layer dominates the passage.",
          "Correction: apply the strict 0.005 × D gap rule. Don't assume textbook efficiencies for sub-kg scale.",
        ],
      },
      {
        id: "s9-c3",
        heading: "Trap 3 — interchanging EGT and TIT",
        body: "Two different temperatures.",
        bullets: [
          "Mistake: assuming EGT (measured) is the same as TIT (inferred).",
          "We measure Exhaust Gas Temperature (EGT) at the tail cone because it's cool enough for sensors.",
          "We INFER the much higher Turbine Inlet Temperature (TIT) from EGT + cycle deck.",
          "Never assume blades are only as hot as the EGT probe — TIT is typically 200–300 °C higher.",
        ],
      },
      {
        id: "s9-c4",
        heading: "Trap 4 — shaft-length neglect",
        body: "Geometry has consequences.",
        bullets: [
          "Mistake: increasing shaft length to accommodate a larger combustor without re-calculating critical speed.",
          "Reality: +1 cm shaft length ≈ −20% RPM strength.",
          "A 2 cm extension can reduce allowable RPM by 40% — engine cannot reach design point.",
          "Correction: every shaft-length change requires a fresh critical-speed analysis.",
        ],
      },
      {
        id: "s9-c5",
        heading: "Connection forward — GT-08",
        body: "Where the residual energy goes.",
        bullets: [
          "The work extracted by your turbine has successfully driven the compressor.",
          "Gas exiting the turbine still has significant enthalpy — high pressure and temperature.",
          "In GT-08 (Converging Nozzle) we'll design the geometry to convert this remaining enthalpy into a high-velocity jet.",
          "That finally produces the thrust required for flight.",
        ],
      },
    ],
    probes: [
      {
        id: "s9-p1",
        type: "mcq",
        kind: "error",
        stem: "A student insists they can use textbook turbine efficiencies (η ≈ 0.92) for their 70 mm hobby engine. What is the BEST correction?",
        options: [
          "They're right — efficiencies scale",
          "Reynolds number drops sharply at hobby scale; boundary-layer losses dominate small passages, so realistic η is 0.85–0.88. Use the strict 0.005 × D gap rule and small-engine benchmarks, not textbook large-engine numbers.",
          "Switch to a smaller wheel",
          "Use steam instead of air",
        ],
        correct: 1,
        explain: "Air molecules don't shrink with your engine. At hobby scale, gap losses, tip-clearance fraction, and boundary-layer dominate. Textbook efficiencies are calibrated for large-engine Reynolds numbers and don't transfer down. Use empirical small-engine values.",
      },
      {
        id: "s9-p2",
        type: "mcq",
        kind: "error",
        stem: "A student claims: 'My EGT is 700 °C, so my blades are at 700 °C and Inconel 713 is fine.' What is the BEST correction?",
        options: [
          "Correct as stated",
          "EGT is measured at the tail cone — TIT (the temperature the blades actually see) is typically 200–300 °C hotter, so the blade is probably at 900–1000 °C. At 1000 °C Inconel 713 is at the edge of its creep limit.",
          "Inconel 713 isn't real",
          "EGT is irrelevant",
        ],
        correct: 1,
        explain: "Confusing EGT with TIT is a classic trap. The gas cools as it expands through the turbine and the nozzle. Blade temperature is set by TIT (combustor exit), not by tail-cone EGT. Always run the cycle deck to infer TIT from EGT, especially when material margin is tight.",
      },
    ],
  },
];

// Summative quiz — mixes the PDF Q1–Q10 with transfer items.
export const SUMMATIVE = [
  {
    id: "q1",
    kind: "concept",
    stem: "Why is a 50% reaction design preferred for maximising stage efficiency in small turbines?",
    options: [
      "It eliminates the need for an NGV",
      "Symmetric pressure drop between stator and rotor gives favourable decelerating gradients in BOTH rows, minimising separation losses",
      "It reduces the TIT requirement",
      "It increases blade speed",
    ],
    correct: 1,
    explain: "50% reaction splits the static-pressure drop equally between NGV and rotor. Both rows then see favourable pressure gradients (flow accelerating with falling pressure), minimising boundary-layer separation. Symmetric velocity triangles are a manufacturing bonus, not the reason.",
  },
  {
    id: "q2",
    kind: "concept",
    stem: "How many vanes does the KJ-66 use in its turbine NGV?",
    options: ["12", "17", "23", "31"],
    correct: 2,
    explain: "KJ-66 standard: 23 vanes. Vane count is set by aerodynamic loading per vane and structural symmetry; 23 is a prime number, which spreads any flow non-uniformity (pattern factor) more evenly across the rotor.",
  },
  {
    id: "q3",
    kind: "analysis",
    stem: "Why does centrifugal stress in a rotating disc PEAK at the bore (smallest radius) rather than at the rim?",
    options: [
      "Material is weaker at the centre",
      "Lamé equations show σ_θ is maximised at r → 0 because of the (R_outer² − k·r²) form; the coefficient on r² is positive but less than 1 in σ_θ, so smaller r means higher stress",
      "Air pressure is lower at the bore",
      "Manufacturing residual stress",
    ],
    correct: 1,
    explain: "σ_θ = (3+ν)/8·ρ·ω²·(R_outer² − ((1+3ν)/(3+ν))·r²). The r² term is subtracted with a coefficient < 1, so σ_θ increases as r decreases. Peak at r = 0 (the bore). That's why disc thickness must be added at the centre.",
  },
  {
    id: "q4",
    kind: "concept",
    stem: "Relationship between TIT and EGT?",
    options: [
      "They are the same — interchangeable",
      "TIT is INFERRED from EGT + cycle deck; TIT is typically 200–300 °C HOTTER than measured EGT",
      "EGT is hotter than TIT",
      "TIT is measured directly by a thermocouple at the turbine inlet",
    ],
    correct: 1,
    explain: "We measure EGT at the tail cone because no sensor survives long-term at TIT. The cycle deck gives the offset — TIT is typically 200–300 °C hotter. Treating EGT as TIT understates blade temperature and is a leading cause of creep failures in hobby engines.",
  },
  {
    id: "q5",
    kind: "evaluation",
    stem: "Primary structural disadvantage of an enclosed (shrouded) rotor at high RPM?",
    options: [
      "The shroud causes flow separation",
      "The shroud adds mass at HIGH radius → centrifugal stress on the shroud → lower allowable RPM than open-bladed rotors",
      "Manufacturing cost",
      "Higher viscous losses",
    ],
    correct: 1,
    explain: "Centrifugal stress ∝ ρ·ω²·r². Putting mass at max r is the worst place possible structurally. The shroud must be carried by the blades, and the blades have to be carried by the disc. Above ~100 000 RPM the structural penalty exceeds the gap-loss benefit, and open rotors win.",
  },
  {
    id: "q6",
    kind: "application",
    stem: "Wheel diameter 50 mm at 160 000 RPM. What is U?",
    options: ["≈ 200 m/s", "≈ 419 m/s", "≈ 838 m/s", "≈ 105 m/s"],
    correct: 1,
    explain: "U = π·D·N/60 = π·0.050·160 000/60 ≈ 419 m/s. Even faster than the KJ-66 reference because RPM was bumped enough to compensate for the smaller wheel.",
  },
  {
    id: "q7",
    kind: "application",
    stem: "70 mm wheel — what is the maximum acceptable tip-clearance gap per the 0.005 × D rule?",
    options: ["0.035 mm", "0.35 mm (within 0.3–0.5 mm band)", "3.5 mm", "0.7 mm"],
    correct: 1,
    explain: "0.005 × 70 = 0.35 mm. Sits in the 0.3–0.5 mm acceptance window. Tighter is jam-on-thermal-expansion risk; looser starts costing measurable efficiency and at ~1.0 mm the engine refuses to run.",
  },
  {
    id: "q8",
    kind: "application",
    stem: "Material yields at 800 MPa at 950 °C. Max allowable σ_max for SF = 1.5?",
    options: ["1200 MPa", "≈ 533 MPa", "800 MPa", "≈ 320 MPa"],
    correct: 1,
    explain: "σ_max = UTS / SF = 800 / 1.5 ≈ 533 MPa. Design constraint at OPERATING temperature, not room T. The bore stress (Lamé) must stay below this number for the rotor to pass.",
  },
  {
    id: "q9",
    kind: "evaluation",
    stem: "White smoke and failure to accelerate during start. Which acceptance threshold has been missed?",
    options: [
      "Tip clearance",
      "Sustain speed — engine is below the RPM where the rotor self-accelerates; adding fuel over-fuels the combustor",
      "Pattern factor",
      "Compressor surge",
    ],
    correct: 1,
    explain: "White smoke = unburnt fuel = combustor running rich with no flame stabilisation, which happens when the rotor is below sustain speed and the throttle has been advanced anyway. Recovery: cool, identify cause (fuel scheduling, air leak, stick coking), retest.",
  },
  {
    id: "q10",
    kind: "application",
    stem: "Shaft length increases from 10 cm to 12 cm. Approximate rotational speed strength loss?",
    options: ["~5%", "~20%", "~40%", "~80%"],
    correct: 2,
    explain: "Rule of thumb: ~20% per cm of shaft extension. 2 cm extension → ~40% loss. At that point the first bending mode probably crosses operating RPM and the engine may not reach design speed. Every length change demands a fresh critical-speed analysis.",
  },
  {
    id: "q11",
    kind: "analysis",
    stem: "An engine is run at 80 000 RPM. A Campbell diagram shows the first blade-torsion natural frequency crossing the 4× engine-order line at 82 000 RPM. What's the right call?",
    options: [
      "Ship it — 82k > 80k so resonance is outside operating range",
      "Resonance crossing is only 2.5% above operating; transients (throttle changes, start-up) will pass through it. Either redesign the blade (stiffer / heavier root) to move the natural frequency further away, or limit operating RPM with margin",
      "Operate at 82 000 RPM instead",
      "Add a damper to the combustor",
    ],
    correct: 1,
    explain: "Margin between operating RPM and any Campbell crossing must be ≥10–15% to avoid transient dwells exciting the mode. 2.5% is far too tight — a brief crossing during throttle-up or shutdown causes HCF damage cumulative over hours. Move the mode or limit RPM.",
  },
  {
    id: "q12",
    kind: "application",
    stem: "Stage work target w = 90 kJ/kg at U = 320 m/s. What is the stage loading coefficient ψ?",
    options: [
      "ψ ≈ 0.28",
      "ψ ≈ 0.88",
      "ψ ≈ 1.5",
      "ψ ≈ 2.5",
    ],
    correct: 1,
    explain: "ψ = w / U² = 90 000 / 320² = 90 000 / 102 400 ≈ 0.88. Inside the typical 0.7–1.5 small-turbine band — acceptable. Higher work demand at lower U would push ψ higher; that's when you'd consider splitting into two stages.",
  },
];

// Concept-to-section index for spaced-repetition reporting.
export const CONCEPT_INDEX = SECTIONS.flatMap(s => [
  ...s.cards.map(c => ({ id: c.id, sectionId: s.id, label: c.heading })),
  { id: `section::${s.id}`, sectionId: s.id, label: `Section ${s.number}: ${s.title}` },
]);

export function findConcept(conceptId) {
  return CONCEPT_INDEX.find(c => c.id === conceptId) || { id: conceptId, label: conceptId };
}
