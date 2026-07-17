% policies/resource_policy.pl
% SnapKitty Rosetta Math Engine — Resource Limits & Scheduling
% -*- mode: prolog -*-

:- module(resource_policy, [
    resource_limits/3,
    should_terminate/2,
    schedule_solver/3
]).

% --- Resource Limits ---
% resource_limits(+Solver, +ProblemSize, -Limits)

resource_limits(sympy, small, limits{timeout_ms: 10000, max_memory_mb: 512, gpu: false}) :-
    !.

resource_limits(sympy, medium, limits{timeout_ms: 30000, max_memory_mb: 2048, gpu: false}) :-
    !.

resource_limits(sympy, large, limits{timeout_ms: 60000, max_memory_mb: 4096, gpu: false}) :-
    !.

resource_limits(z3, small, limits{timeout_ms: 5000, max_memory_mb: 256, gpu: false}) :-
    !.

resource_limits(z3, medium, limits{timeout_ms: 30000, max_memory_mb: 2048, gpu: false}) :-
    !.

resource_limits(cvode, _, limits{timeout_ms: 30000, max_memory_mb: 4096, gpu: false}) :-
    !.

resource_limits(deeponet, _, limits{timeout_ms: 10000, max_memory_mb: 8192, gpu: true}) :-
    !.

resource_limits(singular, _, limits{timeout_ms: 60000, max_memory_mb: 4096, gpu: false}) :-
    !.

resource_limits(lean4, _, limits{timeout_ms: 120000, max_memory_mb: 8192, gpu: false}) :-
    !.

resource_limits(julia, _, limits{timeout_ms: 30000, max_memory_mb: 4096, gpu: false}) :-
    !.

resource_limits(cgal, _, limits{timeout_ms: 30000, max_memory_mb: 4096, gpu: false}) :-
    !.

resource_limits(_, _, limits{timeout_ms: 30000, max_memory_mb: 4096, gpu: false}).

% --- Termination Conditions ---
% should_terminate(+SolverState, -Reason)

should_terminate(state{elapsed_ms: Elapsed, memory_mb: Memory}, timeout) :-
    resource_limits(_, _, limits{timeout_ms: Timeout, max_memory_mb: MaxMem}),
    Elapsed > Timeout.

should_terminate(state{elapsed_ms: _, memory_mb: Memory}, out_of_memory) :-
    resource_limits(_, _, limits{timeout_ms: _, max_memory_mb: MaxMem}),
    Memory > MaxMem.

should_terminate(state{converged: true}, converged).

should_terminate(state{diverged: true}, diverged).

% --- Scheduling ---
% schedule_solver(+Problem, +AvailableSolvers, -SelectedSolver, -Priority)

schedule_solver(Problem, AvailableSolvers, SelectedSolver, Priority) :-
    select_solver(Problem, SolverSpec, _),
    SolverSpec = solver_spec(Solver, _, _),
    member(Solver, AvailableSolvers),
    solver_priority(Solver, Priority),
    SelectedSolver = Solver.

schedule_solver(_, AvailableSolvers, fallback, low) :-
    member(fallback, AvailableSolvers).

% --- Priority Levels ---
solver_priority(lean4, highest).
solver_priority(z3, high).
solver_priority(singular, high).
solver_priority(cvode, medium).
solver_priority(sympy, medium).
solver_priority(julia, medium).
solver_priority(deeponet, low).
solver_priority(cgal, low).
solver_priority(fallback, lowest).

% --- Load Balancing ---
% distribute_problems(+Problems, +Solvers, -Assignments)

distribute_problems([], _, []).
distribute_problems([P|Ps], Solvers, [assignment(P, S)|As]) :-
    schedule_solver(P, Solvers, S, _),
    distribute_problems(Ps, Solvers, As).

% --- Resource Monitoring ---
% monitor_resource(+SolverPID, +Limits) -> triggers termination if exceeded

monitor_resource(PID, Limits) :-
    limits{timeout_ms: Timeout, max_memory_mb: MaxMem} = Limits,
    ( get_memory_usage(PID, Mem), Mem > MaxMem ->
        terminate_solver(PID, out_of_memory)
    ; get_elapsed_ms(PID, Elapsed), Elapsed > Timeout ->
        terminate_solver(PID, timeout)
    ; true
    ).

% --- Placeholder Predicates ---
get_memory_usage(_, 0).
get_elapsed_ms(_, 0).
terminate_solver(_, _).

% --- Query Interface ---
% ?- resource_limits(z3, medium, Limits).
% ?- should_terminate(state{elapsed_ms: 40000, memory_mb: 1000, converged: false}, Reason).
% ?- schedule_solver(eq(add([var(x), const(1)]), const(0)), [sympy, z3], Solver, Priority).
