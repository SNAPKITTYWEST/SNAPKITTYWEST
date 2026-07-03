# Sedona Spine - FFI closure enforcement

add_library(pirtm-sedona-spine
    src/SedonaSpine.cpp
)

target_include_directories(pirtm-sedona-spine
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Install headers
install(DIRECTORY include/ DESTINATION include)

# Install library
install(TARGETS pirtm-sedona-spine
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
)

if(PIRTM_BUILD_TESTS)
    add_executable(pirtm-sedona-spine-test
        test/test_sedona_spine.cpp
    )
    target_link_libraries(pirtm-sedona-spine-test
        PRIVATE
            pirtm-sedona-spine
    )
    add_test(NAME sedona_spine_test COMMAND pirtm-sedona-spine-test)
endif()
