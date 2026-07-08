---
name: fortran-modules-memory
description: Fortran module visibility rules, subroutine vs function patterns, and safe memory management with allocatable arrays
source: auto-skill
extracted_at: '2026-07-08T07:38:46.558Z'
---

# Fortran Module Visibility and Memory Management

## Context
Building Fortran modules with derived types, subroutines, and allocatable arrays. Common pitfalls around visibility, linking, and re-allocation that cause confusing compile-time and runtime errors.

## Module Visibility Rules

### Problem: "Derived type being used before it is defined"

When a program uses a module but the derived type isn't in the `public` list:

```fortran
module sat_solver
    implicit none
    private
    public :: sat_instance, solve_sat  ! ❌ Missing: assignment type
    
    type :: assignment
        integer, allocatable :: values(:)
    end type
end module

program test
    use sat_solver
    type(assignment) :: assign  ! ❌ ERROR: type not visible
end program
```

**Fix:** Export ALL types used by callers:

```fortran
module sat_solver
    implicit none
    private
    ! ✅ Export every type, subroutine, and function used externally
    public :: sat_instance, assignment, solve_sat, dpll, init_sat, add_clause
end module
```

### Rule of Thumb
If a caller needs to declare a variable of that type, it MUST be in the `public` list. This includes:
- Derived types used as dummy arguments
- Derived types declared in the calling scope
- Subroutines and functions called from outside

## Subroutine vs Function Linking

### Problem: "Undefined reference to `init_sat_'"

When a subroutine is defined inside a module but not exported, the linker can't find it:

```fortran
module sat_solver
    implicit none
    private
    public :: sat_instance  ! ❌ init_sat not exported
    
    subroutine init_sat(inst, nvars, nclauses)
        ! ...
    end subroutine
end module

program test
    use sat_solver
    call init_sat(inst, 3, 2)  ! ❌ LINKER ERROR: undefined reference
end program
```

**Fix:** Add subroutines to the `public` list:

```fortran
public :: sat_instance, assignment, init_sat, add_clause, solve_sat
```

### Function to Subroutine Conversion

Functions returning derived types can cause issues. Convert to subroutine with output parameter:

```fortran
! ❌ Function returning logical (can cause issues with some compilers)
function solve_sat(inst, assign) result(sat)
    type(sat_instance), intent(in) :: inst
    type(assignment), intent(inout) :: assign
    logical :: sat
    sat = dpll(inst, assign)
end function

! ✅ Subroutine with output parameter (more portable)
subroutine solve_sat(inst, assign, sat)
    type(sat_instance), intent(in) :: inst
    type(assignment), intent(inout) :: assign
    logical, intent(out) :: sat
    sat = dpll(inst, assign)
end subroutine
```

Call site changes from `sat = solve_sat(inst, assign)` to `call solve_sat(inst, assign, sat)`.

## Allocatable Array Memory Management

### Problem: "Attempting to allocate already allocated variable"

When reusing a derived type with allocatable components across multiple calls:

```fortran
subroutine init_sat(inst, nvars, nclauses)
    type(sat_instance), intent(inout) :: inst
    integer, intent(in) :: nvars, nclauses
    
    inst%num_vars = nvars
    allocate(inst%clauses(nclauses, 100))  ! ❌ CRASH if already allocated
    allocate(inst%clause_lengths(nclauses)) ! ❌ CRASH if already allocated
end subroutine
```

**Fix:** Deallocate before allocating:

```fortran
subroutine init_sat(inst, nvars, nclauses)
    type(sat_instance), intent(inout) :: inst
    integer, intent(in) :: nvars, nclauses
    
    ! ✅ Safe re-initialization
    if (allocated(inst%clauses)) deallocate(inst%clauses)
    if (allocated(inst%clause_lengths)) deallocate(inst%clause_lengths)
    
    inst%num_vars = nvars
    inst%num_clauses = nclauses
    allocate(inst%clauses(nclauses, 100))
    allocate(inst%clause_lengths(nclauses))
    inst%clauses = 0
    inst%clause_lengths = 0
end subroutine
```

### Pattern for All Allocatable Components

```fortran
type :: my_type
    integer, allocatable :: array1(:)
    real, allocatable :: array2(:,:)
    character(len=64), allocatable :: strings(:)
end type

subroutine init_my_type(obj, size1, size2)
    type(my_type), intent(inout) :: obj
    integer, intent(in) :: size1, size2
    
    ! Deallocate all allocatable components first
    if (allocated(obj%array1)) deallocate(obj%array1)
    if (allocated(obj%array2)) deallocate(obj%array2)
    if (allocated(obj%strings)) deallocate(obj%strings)
    
    ! Then allocate fresh
    allocate(obj%array1(size1))
    allocate(obj%array2(size1, size2))
    allocate(obj%strings(size1))
end subroutine
```

## Complete Working Module Pattern

```fortran
module my_module
    implicit none
    private
    
    ! Export everything the caller needs
    public :: my_type, my_other_type
    public :: init_my_type, do_something, compute_result
    
    integer, parameter :: MAX_SIZE = 10000
    
    type :: my_type
        integer :: count
        integer, allocatable :: data(:)
    end type
    
    type :: my_other_type
        real, allocatable :: matrix(:,:)
    end type

contains

    subroutine init_my_type(obj, n)
        type(my_type), intent(inout) :: obj
        integer, intent(in) :: n
        
        if (allocated(obj%data)) deallocate(obj%data)
        obj%count = n
        allocate(obj%data(n))
        obj%data = 0
    end subroutine
    
    subroutine do_something(obj, result)
        type(my_type), intent(in) :: obj
        integer, intent(out) :: result
        result = sum(obj%data)
    end subroutine
    
    function compute_result(n) result(val)
        integer, intent(in) :: n
        integer :: val
        val = n * 2
    end function

end module
```

## Common Error Messages and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Derived type 'X' being used before defined` | Type not in `public` list | Add to `public ::` |
| `Undefined reference to 'sub_'` | Subroutine not exported | Add to `public ::` |
| `Attempting to allocate already allocated` | Missing deallocation check | Add `if (allocated(...))` guard |
| `Symbol has no IMPLICIT type` | Variable type not visible | Check module `public` exports |
| `Dummy argument type mismatch` | Function vs subroutine mismatch | Convert to subroutine with `intent(out)` |

## Compilation Flags

```bash
# Development (with bounds checking)
gfortran -g -fcheck=bounds -Wall -o program source.f90

# Production (optimized)
gfortran -O3 -o program source.f90

# With OpenMP parallelism
gfortran -O3 -fopenmp -o program source.f90
```

## Unicode Characters in Print Statements

### Problem: "Line truncated" with Unicode box-drawing characters

gfortran has a default line length limit (132 characters for free-form). Unicode characters like box-drawing symbols (═, ╔, ║) can cause truncation errors:

```fortran
print *, "═══════════════════════════════════════════════════════════"
! ❌ ERROR: Line truncated at column 132
```

**Fix 1: Use ASCII characters instead**

```fortran
print *, "==========================================================="
! ✅ Works: ASCII characters don't cause truncation
```

**Fix 2: Use shorter Unicode strings**

```fortran
print *, "==========="
print *, "  Title"
print *, "==========="
! ✅ Works: Shorter lines stay within limit
```

**Fix 3: Increase line length limit (compiler flag)**

```bash
gfortran -ffree-line-length-none -O3 -o program source.f90
```

### Rule of Thumb
- Avoid Unicode box-drawing in `print` statements
- Use ASCII `=`, `-`, `*` for borders and separators
- If you need Unicode, keep lines short or use compiler flags

## When to Use

- Fortran modules with derived types used across program units
- Reusable initialization subroutines called multiple times
- Allocatable arrays in derived types
- SAT solvers, numerical simulations, scientific computing

## When NOT to Use

- Simple programs with no modules
- Fixed-size arrays (no allocatable components)
- When using Fortran 2003+ automatic allocation on assignment
