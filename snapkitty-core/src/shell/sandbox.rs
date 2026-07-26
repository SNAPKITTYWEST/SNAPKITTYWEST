//! SnapKitty Sandbox Isolation Layer
//! Linux namespaces + seccomp for shell execution
//!
//! MOAT Ref: SnapKittyShellContract.lean
//! Architecture: Verified Autonomous OS - Kernel Gate Pattern
//!
//! Hardening layers:
//! 1. Namespace isolation (PID, NET, MNT, UTS, IPC, USER)
//! 2. Seccomp syscall filtering
//! 3. Resource limits (cgroups)
//! 4. Filesystem isolation (chroot/pivot_root)
//! 5. Network isolation (no host network access)

use std::collections::HashMap;

// ── Sandbox Configuration ──────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct SandboxConfig {
    /// Enable PID namespace isolation
    pub pid_ns: bool,
    /// Enable network namespace isolation
    pub net_ns: bool,
    /// Enable mount namespace isolation
    pub mnt_ns: bool,
    /// Enable UTS namespace isolation
    pub uts_ns: bool,
    /// Enable IPC namespace isolation
    pub ipc_ns: bool,
    /// Enable user namespace isolation
    pub user_ns: bool,
    /// Enable seccomp syscall filtering
    pub seccomp: bool,
    /// Enable cgroup resource limits
    pub cgroups: bool,
    /// Enable filesystem isolation
    pub filesystem_isolation: bool,
    /// Maximum memory in MB
    pub max_memory_mb: u64,
    /// Maximum CPU time in ms
    pub max_cpu_ms: u64,
    /// Maximum number of processes
    pub max_procs: u32,
    /// Allowed syscalls (seccomp whitelist)
    pub allowed_syscalls: Vec<String>,
    /// Read-only filesystem paths
    pub readonly_paths: Vec<String>,
    /// Blocked filesystem paths
    pub blocked_paths: Vec<String>,
}

impl Default for SandboxConfig {
    fn default() -> Self {
        Self {
            pid_ns: true,
            net_ns: true,
            mnt_ns: true,
            uts_ns: true,
            ipc_ns: true,
            user_ns: true,
            seccomp: true,
            cgroups: true,
            filesystem_isolation: true,
            max_memory_mb: 256,
            max_cpu_ms: 10_000,
            max_procs: 32,
            allowed_syscalls: vec![
                "read".into(),
                "write".into(),
                "open".into(),
                "close".into(),
                "stat".into(),
                "fstat".into(),
                "lstat".into(),
                "poll".into(),
                "lseek".into(),
                "mmap".into(),
                "mprotect".into(),
                "munmap".into(),
                "brk".into(),
                "ioctl".into(),
                "access".into(),
                "pipe".into(),
                "dup".into(),
                "dup2".into(),
                "clone".into(),
                "fork".into(),
                "execve".into(),
                "exit".into(),
                "wait4".into(),
                "kill".into(),
                "getpid".into(),
                "socket".into(),
                "connect".into(),
                "sendto".into(),
                "recvfrom".into(),
                "bind".into(),
                "listen".into(),
                "accept".into(),
                "getcwd".into(),
                "chdir".into(),
                "rename".into(),
                "mkdir".into(),
                "rmdir".into(),
                "link".into(),
                "unlink".into(),
                "chmod".into(),
                "chown".into(),
                "getuid".into(),
                "getgid".into(),
                "geteuid".into(),
                "getegid".into(),
                "setuid".into(),
                "setgid".into(),
            ],
            readonly_paths: vec![
                "/usr".into(),
                "/lib".into(),
                "/lib64".into(),
                "/etc".into(),
            ],
            blocked_paths: vec![
                "/proc".into(),
                "/sys".into(),
                "/dev".into(),
                "/root".into(),
                "/home".into(),
                "/var".into(),
                "/tmp".into(),
            ],
        }
    }
}

// ── Sandbox Profile Presets ────────────────────────────────────────────────────

impl SandboxConfig {
    /// Minimal sandbox: namespace isolation only
    pub fn minimal() -> Self {
        Self {
            pid_ns: true,
            net_ns: false,
            mnt_ns: false,
            uts_ns: true,
            ipc_ns: false,
            user_ns: true,
            seccomp: false,
            cgroups: false,
            filesystem_isolation: false,
            max_memory_mb: 512,
            max_cpu_ms: 30_000,
            max_procs: 64,
            ..Default::default()
        }
    }

    /// Standard sandbox: full namespace + seccomp
    pub fn standard() -> Self {
        Self::default()
    }

    /// Hardened sandbox: everything + strict seccomp
    pub fn hardened() -> Self {
        Self {
            pid_ns: true,
            net_ns: true,
            mnt_ns: true,
            uts_ns: true,
            ipc_ns: true,
            user_ns: true,
            seccomp: true,
            cgroups: true,
            filesystem_isolation: true,
            max_memory_mb: 128,
            max_cpu_ms: 5_000,
            max_procs: 16,
            allowed_syscalls: vec![
                "read".into(),
                "write".into(),
                "open".into(),
                "close".into(),
                "stat".into(),
                "fstat".into(),
                "lseek".into(),
                "mmap".into(),
                "mprotect".into(),
                "munmap".into(),
                "brk".into(),
                "exit".into(),
                "getpid".into(),
                "getcwd".into(),
            ],
            readonly_paths: vec![
                "/usr".into(),
                "/lib".into(),
                "/lib64".into(),
                "/etc".into(),
            ],
            blocked_paths: vec![
                "/proc".into(),
                "/sys".into(),
                "/dev".into(),
                "/root".into(),
                "/home".into(),
                "/var".into(),
                "/tmp".into(),
                "/run".into(),
                "/boot".into(),
                "/opt".into(),
                "/srv".into(),
            ],
        }
    }

    /// Agent-specific sandbox based on agent type
    pub fn for_agent(agent_type: &str) -> Self {
        match agent_type {
            "sentinel" => Self::hardened(), // Security: maximum isolation
            "forge" => Self::standard(),    // Code gen: needs write access
            "ledge" => Self::hardened(),    // Ledger: read-only, strict
            "atlas" => Self::standard(),    // Analysis: standard
            "oracle" => Self::minimal(),    // Lookup: minimal
            "nexus" => Self::standard(),    // Orchestrator: standard
            _ => Self::standard(),
        }
    }
}

// ── Sandbox Builder (generates runtime config) ────────────────────────────────

#[derive(Debug, Clone)]
pub struct SandboxProfile {
    pub name: String,
    pub config: SandboxConfig,
    pub namespace_flags: u32,
    pub cgroup_limits: CgroupLimits,
    pub seccomp_filter: SeccompFilter,
    pub mount_points: Vec<MountPoint>,
}

#[derive(Debug, Clone)]
pub struct CgroupLimits {
    pub memory_mb: u64,
    pub cpu_ms: u64,
    pub max_procs: u32,
    pub io_read_bps: u64,
    pub io_write_bps: u64,
}

#[derive(Debug, Clone)]
pub struct SeccompFilter {
    pub default_action: SeccompAction,
    pub rules: Vec<SeccompRule>,
}

#[derive(Debug, Clone)]
pub enum SeccompAction {
    Allow,
    Deny,
    Kill,
    Trap,
    Log,
}

#[derive(Debug, Clone)]
pub struct SeccompRule {
    pub syscall: String,
    pub action: SeccompAction,
    pub conditions: Vec<SeccompCondition>,
}

#[derive(Debug, Clone)]
pub struct SeccompCondition {
    pub arg_index: u32,
    pub op: SeccompCmpOp,
    pub value: u64,
}

#[derive(Debug, Clone)]
pub enum SeccompCmpOp {
    Eq,
    Ne,
    Lt,
    Le,
    Gt,
    Ge,
    MaskedEq,
}

#[derive(Debug, Clone)]
pub struct MountPoint {
    pub source: String,
    pub target: String,
    pub fstype: String,
    pub flags: u32,
    pub data: Option<String>,
}

// ── Sandbox Builder ────────────────────────────────────────────────────────────

pub struct SandboxBuilder;

impl SandboxBuilder {
    /// Build a sandbox profile from config
    pub fn build(name: &str, config: SandboxConfig) -> SandboxProfile {
        let namespace_flags = Self::compute_namespace_flags(&config);
        let cgroup_limits = Self::compute_cgroup_limits(&config);
        let seccomp_filter = Self::compute_seccomp_filter(&config);
        let mount_points = Self::compute_mount_points(&config);

        SandboxProfile {
            name: name.to_string(),
            config,
            namespace_flags,
            cgroup_limits,
            seccomp_filter,
            mount_points,
        }
    }

    /// Compute Linux namespace clone flags
    fn compute_namespace_flags(config: &SandboxConfig) -> u32 {
        let mut flags: u32 = 0;

        if config.pid_ns {
            flags |= 0x20000000; // CLONE_NEWPID
        }
        if config.net_ns {
            flags |= 0x40000000; // CLONE_NEWNET
        }
        if config.mnt_ns {
            flags |= 0x00020000; // CLONE_NEWNS
        }
        if config.uts_ns {
            flags |= 0x04000000; // CLONE_NEWUTS
        }
        if config.ipc_ns {
            flags |= 0x08000000; // CLONE_NEWIPC
        }
        if config.user_ns {
            flags |= 0x10000000; // CLONE_NEWUSER
        }

        flags
    }

    /// Compute cgroup resource limits
    fn compute_cgroup_limits(config: &SandboxConfig) -> CgroupLimits {
        CgroupLimits {
            memory_mb: config.max_memory_mb,
            cpu_ms: config.max_cpu_ms,
            max_procs: config.max_procs,
            io_read_bps: 100 * 1024 * 1024,  // 100 MB/s
            io_write_bps: 50 * 1024 * 1024,   // 50 MB/s
        }
    }

    /// Compute seccomp filter rules
    fn compute_seccomp_filter(config: &SandboxConfig) -> SeccompFilter {
        if !config.seccomp {
            return SeccompFilter {
                default_action: SeccompAction::Allow,
                rules: vec![],
            };
        }

        let rules = config.allowed_syscalls.iter().map(|syscall| {
            SeccompRule {
                syscall: syscall.clone(),
                action: SeccompAction::Allow,
                conditions: vec![],
            }
        }).collect();

        SeccompFilter {
            default_action: SeccompAction::Kill,
            rules,
        }
    }

    /// Compute mount points for filesystem isolation
    fn compute_mount_points(config: &SandboxConfig) -> Vec<MountPoint> {
        let mut mounts = Vec::new();

        // Read-only mounts
        for path in &config.readonly_paths {
            mounts.push(MountPoint {
                source: path.clone(),
                target: path.clone(),
                fstype: "bind".into(),
                flags: 0x1, // MS_RDONLY
                data: None,
            });
        }

        // Blocked mounts (empty bind to hide)
        for path in &config.blocked_paths {
            mounts.push(MountPoint {
                source: "/dev/null".into(),
                target: path.clone(),
                fstype: "bind".into(),
                flags: 0x1, // MS_RDONLY
                data: None,
            });
        }

        mounts
    }
}

// ── Sandbox Runtime (executes with isolation) ─────────────────────────────────

pub struct SandboxRuntime {
    profile: SandboxProfile,
}

impl SandboxRuntime {
    pub fn new(profile: SandboxProfile) -> Self {
        Self { profile }
    }

    /// Get the profile
    pub fn profile(&self) -> &SandboxProfile {
        &self.profile
    }

    /// Generate Linux namespace configuration
    pub fn namespace_config(&self) -> HashMap<String, bool> {
        let mut config = HashMap::new();
        config.insert("pid".into(), self.profile.config.pid_ns);
        config.insert("net".into(), self.profile.config.net_ns);
        config.insert("mnt".into(), self.profile.config.mnt_ns);
        config.insert("uts".into(), self.profile.config.uts_ns);
        config.insert("ipc".into(), self.profile.config.ipc_ns);
        config.insert("user".into(), self.profile.config.user_ns);
        config
    }

    /// Generate seccomp profile (JSON format for Docker/runc)
    pub fn seccomp_profile_json(&self) -> String {
        let filter = &self.profile.seccomp_filter;

        let default_action = match filter.default_action {
            SeccompAction::Allow => "SCMP_ACT_ALLOW",
            SeccompAction::Deny | SeccompAction::Kill => "SCMP_ACT_KILL",
            SeccompAction::Trap => "SCMP_ACT_TRAP",
            SeccompAction::Log => "SCMP_ACT_LOG",
        };

        let rules_json: Vec<String> = filter.rules.iter().map(|rule| {
            format!(
                r#"{{"names":["{}"],"action":"SCMP_ACT_ALLOW"}}"#,
                rule.syscall
            )
        }).collect();

        format!(
            r#"{{"defaultAction":"{}","architectures":["SCMP_ARCH_X86_64"],"syscalls":[{}]}}"#,
            default_action,
            rules_json.join(",")
        )
    }

    /// Generate cgroup configuration
    pub fn cgroup_config(&self) -> HashMap<String, String> {
        let limits = &self.profile.cgroup_limits;
        let mut config = HashMap::new();

        config.insert("memory.max".into(), (limits.memory_mb * 1024 * 1024).to_string());
        config.insert("cpu.max".into(), format!("{} 100000", limits.cpu_ms * 1000));
        config.insert("pids.max".into(), limits.max_procs.to_string());
        config.insert("io.max".into(), format!(
            "8:0 rbps={} wbps={}",
            limits.io_read_bps, limits.io_write_bps
        ));

        config
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_is_standard() {
        let config = SandboxConfig::default();
        assert!(config.pid_ns);
        assert!(config.net_ns);
        assert!(config.seccomp);
        assert_eq!(config.max_memory_mb, 256);
    }

    #[test]
    fn hardened_config_is_strict() {
        let config = SandboxConfig::hardened();
        assert!(config.pid_ns);
        assert!(config.net_ns);
        assert!(config.mnt_ns);
        assert!(config.seccomp);
        assert!(config.cgroups);
        assert!(config.filesystem_isolation);
        assert_eq!(config.max_memory_mb, 128);
        assert_eq!(config.max_cpu_ms, 5_000);
    }

    #[test]
    fn agent_sandbox_profiles() {
        let sentinel = SandboxConfig::for_agent("sentinel");
        assert_eq!(sentinel.max_memory_mb, 128);

        let forge = SandboxConfig::for_agent("forge");
        assert_eq!(forge.max_memory_mb, 256);

        let oracle = SandboxConfig::for_agent("oracle");
        assert_eq!(oracle.max_memory_mb, 512);
    }

    #[test]
    fn builder_creates_valid_profile() {
        let config = SandboxConfig::standard();
        let profile = SandboxBuilder::build("test", config);

        assert_eq!(profile.name, "test");
        assert!(profile.namespace_flags > 0);
        assert!(profile.cgroup_limits.memory_mb > 0);
    }

    #[test]
    fn seccomp_profile_generates_json() {
        let config = SandboxConfig::hardened();
        let profile = SandboxBuilder::build("test", config);
        let runtime = SandboxRuntime::new(profile);

        let json = runtime.seccomp_profile_json();
        assert!(json.contains("SCMP_ACT_KILL"));
        assert!(json.contains("SCMP_ARCH_X86_64"));
    }
}
