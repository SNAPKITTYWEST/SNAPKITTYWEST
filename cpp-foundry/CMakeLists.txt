cmake_minimum_required(VERSION 3.20)
project(foundry_intel VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Main library
add_library(foundry_core STATIC
    src/goldilocks.cpp
    src/pmat.cpp
    src/spectral.cpp
    src/recurrence.cpp
    src/gate.cpp
    src/certify.cpp
    src/audit.cpp
    src/linker.cpp
    src/sha256.cpp
)
target_include_directories(foundry_core PUBLIC include)

# Main executable
add_executable(foundry src/main.cpp)
target_link_libraries(foundry PRIVATE foundry_core)

# Test executable
add_executable(foundry_test src/test.cpp)
target_link_libraries(foundry_test PRIVATE foundry_core)
