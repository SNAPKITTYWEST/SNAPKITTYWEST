# Multiplicity Functor - Type-safe multiplicity tracking

add_library(pirtm-multiplicity
    src/MultiplicityFunctor.cpp
)

target_include_directories(pirtm-multiplicity
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Install headers
install(DIRECTORY include/ DESTINATION include)

# Install library
install(TARGETS pirtm-multiplicity
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
)

if(PIRTM_BUILD_TESTS)
    add_executable(pirtm-multiplicity-test
        test/test_multiplicity.cpp
    )
    target_link_libraries(pirtm-multiplicity-test
        PRIVATE
            pirtm-multiplicity
    )
    add_test(NAME multiplicity_test COMMAND pirtm-multiplicity-test)
endif()
