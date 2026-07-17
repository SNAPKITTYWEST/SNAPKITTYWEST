% policies/solver_policy.pl
% SnapKitty Rosetta Math Engine — Solver Dispatch Policy
% -*- mode: prolog -*-

:- module(solver_policy, [
    select_solver/3,
    equation_class/2,
    proof_requirement/3
]).

% --- Solver Capabilities (Facts) ---
solver_capability(z3, smt, [quantifiers, non_linear_arithmetic, bitvectors, arrays]).
solver_capability(cvode, numeric_ode, [stiff, implicit, adjoint_sensitivity, gpu]).
solver_capability(singular, groebner_basis, [polynomial_ideal, primary_decomposition, parametric]).
solver_capability(lean4, formal_proof, [dependent_types, calculus, topology, verified_kernel]).
solver_capability(deeponet, neural_operator, [pde_solution_operator, high_dim, mesh_free, requires_training]).
solver_capability(sympy, symbolic, [integration, limits, ode_series, matrix_symbolic, free]).
solver_capability(cgal, geometric, [arrangements, triangulation, voronoi, boolean_ops]).
solver_capability(cvc5, smt, [quantifiers, non_linear_arithmetic, strings]).
solver_capability(vampire, theorem_proving, [first_order, equational_reasoning]).
solver_capability(julia, numeric, [differential_equations, optimization, automatic_differentiation]).

% --- Domain Classification (Rules) ---
equation_class(Term, polynomial_system) :-
    is_polynomial(Term).

equation_class(Term, ode_system(stiff)) :-
    is_ode(Term),
    has_stiffness(Term, stiff).

equation_class(Term, ode_system(non_stiff)) :-
    is_ode(Term),
    has_stiffness(Term, non_stiff).

equation_class(Term, pde_system(Geometry)) :-
    is_pde(Term),
    pde_geometry(Term, Geometry).

equation_class(Term, integral_equation) :-
    is_integral_eq(Term).

equation_class(Term, logical_constraint) :-
    is_logical(Term).

equation_class(Term, geometric) :-
    is_geometric(Term).

equation_class(Term, tensor_algebra) :-
    is_tensor(Term).

equation_class(Term, symbolic_integration) :-
    is_symbolic_integral(Term).

equation_class(Term, symbolic_limit) :-
    is_symbolic_limit(Term).

equation_class(Term, linear_algebra) :-
    is_linear_algebra(Term).

equation_class(_, fallback).

% --- Dispatch Logic ---
select_solver(Term, solver_spec(Solver, Capabilities, Params), proof_req(ProofLevel, ProofBackends)) :-
    equation_class(Term, Class),
    dispatch_class(Class, solver_spec(Solver, Capabilities, Params), proof_req(ProofLevel, ProofBackends)).

% Polynomial Systems -> Groebner (Singular) + Formal Cert (Lean)
dispatch_class(polynomial_system,
    solver_spec(singular, [groebner, primary_decomp], params{timeout: 60000}),
    proof_req(witness, [groebner_basis])).

% Stiff ODEs -> CVODE (Sundials) + Adjoint for Gradients
dispatch_class(ode_system(stiff),
    solver_spec(cvode, [bdf, newton, adjoint], params{rtol: 1e-9, atol: 1e-12}),
    proof_req(none, [])).

% Non-stiff ODEs -> Julia for flexibility
dispatch_class(ode_system(non_stiff),
    solver_spec(julia, [rodas5, auto_diff], params{}),
    proof_req(none, [])).

% High-Dim PDE -> Neural Operator
dispatch_class(pde_system(Geometry),
    solver_spec(deeponet, [inference], params{gpu: true, model_path: Model}),
    proof_req(residual_check, [pde_residual < 1e-4])) :-
    model_available(Geometry, Model).

% Symbolic Integration/Limits -> SymPy
dispatch_class(symbolic_integration,
    solver_spec(sympy, [integration, series, simplification], params{}),
    proof_req(none, [])).

dispatch_class(symbolic_limit,
    solver_spec(sympy, [limits, series], params{}),
    proof_req(none, [])).

% Logical Constraints -> Z3
dispatch_class(logical_constraint,
    solver_spec(z3, [quantifiers, non_linear_arithmetic], params{timeout: 30000}),
    proof_req(proof_object, [z3_proof])).

% Geometric -> CGAL
dispatch_class(geometric,
    solver_spec(cgal, [arrangements, triangulation, voronoi], params{}),
    proof_req(none, [])).

% Linear Algebra -> SymPy
dispatch_class(linear_algebra,
    solver_spec(sympy, [matrix_symbolic, eigenvalues, decomposition], params{}),
    proof_req(none, [])).

% Fallback chain: SymPy -> Z3
dispatch_class(fallback,
    solver_spec(fallback_chain, [sympy, cvode, z3], params{timeout: 30000}),
    proof_req(best_effort, [])).

% --- Proof Policy Integration ---
proof_requirement(Context, Term, proof_req(lean4, [full_certificate])) :-
    critical_domain(Context),
    equation_class(Term, _),
    \+ trivial_arithmetic(Term).

proof_requirement(_, _, proof_req(none, [])).

% --- Helper Predicates ---
is_polynomial(eq(LHS, RHS)) :-
    polynomial(LHS),
    polynomial(RHS).

polynomial(const(_)).
polynomial(var(_)).
polynomial(add(Terms)) :-
    maplist(polynomial, Terms).
polynomial(mul(Terms)) :-
    maplist(polynomial, Terms).
polynomial(pow(Base, Exp)) :-
    polynomial(Base),
    integer_exp(Exp).

integer_exp(const(Int)) :-
    integer(Int),
    Int >= 0.

is_ode(eq(LHS, _)) :-
    contains_derivative(LHS).

contains_derivative(derivative(_, _)).
contains_derivative(add(Terms)) :-
    maplist(contains_derivative, Terms).
contains_derivative(mul(Terms)) :-
    maplist(contains_derivative, Terms).

has_stiffness(_, unknown).

is_pde(eq(LHS, _)) :-
    contains_partial_derivative(LHS).

contains_partial_derivative(derivative(_, _)).
contains_partial_derivative(add(Terms)) :-
    maplist(contains_partial_derivative, Terms).

pde_geometry(_, euclidean).

is_integral_eq(eq(LHS, _)) :-
    contains_integral(LHS).

contains_integral(integral(_, _, _)).
contains_integral(add(Terms)) :-
    maplist(contains_integral, Terms).

is_logical(and(_)) :- !.
is_logical(or(_)) :- !.
is_logical(not(_)) :- !.
is_logical(implies(_, _)) :- !.
is_logical(forall(_, _, _)) :- !.
is_logical(exists(_, _, _)) :- !.

is_geometric(geometric(_, _)).

is_tensor(tensor(_, _)).

is_linear_algebra(matrix(_)).

is_symbolic_integral(integral(_, _, _)) :- !.
is_symbolic_integral(derivative(_, _)).

is_symbolic_limit(limit(_, _, _, _)).

trivial_arithmetic(eq(const(A), const(B))) :-
    number(A),
    number(B).

critical_domain(financial).
critical_domain(medical).
critical_domain(safety).

model_available(euclidean, 'models/deeponet_euclidean.onnx').
model_available(spherical, 'models/deeponet_spherical.onnx').

% --- Query Interface ---
% ?- select_solver(eq(add([pow(var(x), const(2)), const(1)]), const(0)), Solver, Proof).
