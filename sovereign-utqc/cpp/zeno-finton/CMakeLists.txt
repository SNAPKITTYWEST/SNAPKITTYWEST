# Zeno-Finton Controller - Exponential decay gain controller

add_library(pirtm-zeno-finton
    src/ZenoFinton.cpp
)

target_include_directories(pirtm-zeno-finton
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Install headers
install(DIRECTORY include/ DESTINATION include)

# Install library
install(TARGETS pirtm-zeno-finton
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
)

if(PIRTM_BUILD_TESTS)
    add_executable(pirtm-zeno-finton-test
        test/test_zeno_finton.cpp
    )
    target_link_libraries(pirtm-zeno-finton-test
        PRIVATE
            pirtm-zeno-finton
    )
    add_test(NAME zeno_finton_test COMMAND pirtm-zeno-finton-test)
endif()
