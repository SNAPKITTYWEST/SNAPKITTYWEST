cmake_minimum_required(VERSION 3.20)
project(sovereign_array VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(sovarr STATIC
    src/sovereign_array.cpp
)
target_include_directories(sovarr PUBLIC include)

add_executable(sovarr_demo src/main.cpp)
target_link_libraries(sovarr_demo PRIVATE sovarr)

add_executable(sovarr_test test/test.cpp)
target_link_libraries(sovarr_test PRIVATE sovarr)
