// Constants for host system resources
const HOST_RESOURCES = {
    cpu: 8,    // 8 cores
    ram: 16,   // 16 GB
    disk: 500  // 500 GB
};

// Track VMs and resource usage
let vms = [];
let usedResources = {
    cpu: 0,
    ram: 0,
    disk: 0
};

// VM counter for unique IDs
let vmCounter = 1;

// For simulating VM loads
const VM_LOAD_LEVELS = {
    idle: 0.2,      // 20% of allocated resources
    low: 0.4,       // 40% of allocated resources
    medium: 0.7,    // 70% of allocated resources
    high: 0.9,      // 90% of allocated resources
    max: 1.0        // 100% of allocated resources
};

// For tracking resource changes and animations
let resourceChangeInProgress = false;
let hypervisorProcessingQueue = [];

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Control elements
    const createVmBtn = document.getElementById('create-vm');
    const startVmBtn = document.getElementById('start-vm');
    const pauseVmBtn = document.getElementById('pause-vm');
    const suspendVmBtn = document.getElementById('suspend-vm');
    const destroyVmBtn = document.getElementById('destroy-vm');
    const vmSelector = document.getElementById('vm-selector');
    
    // Resource sliders and values
    const cpuSlider = document.getElementById('cpu-slider');
    const ramSlider = document.getElementById('ram-slider');
    const diskSlider = document.getElementById('disk-slider');
    const cpuValue = document.getElementById('cpu-value');
    const ramValue = document.getElementById('ram-value');
    const diskValue = document.getElementById('disk-value');

    // Dynamic resource management
    const dynamicCpuSlider = document.getElementById('dynamic-cpu-slider');
    const dynamicRamSlider = document.getElementById('dynamic-ram-slider');
    const dynamicDiskSlider = document.getElementById('dynamic-disk-slider');
    const dynamicCpuValue = document.getElementById('dynamic-cpu-value');
    const dynamicRamValue = document.getElementById('dynamic-ram-value');
    const dynamicDiskValue = document.getElementById('dynamic-disk-value');
    const applyResourcesBtn = document.getElementById('apply-resources');

    // Load simulation buttons
    const increaseLoadBtn = document.getElementById('increase-load');
    const decreaseLoadBtn = document.getElementById('decrease-load');
    
    // Resource displays
    const cpuSummary = document.getElementById('cpu-summary');
    const ramSummary = document.getElementById('ram-summary');
    const diskSummary = document.getElementById('disk-summary');
    
    // Containers
    const vmsContainer = document.getElementById('vms-container');
    const logsContainer = document.getElementById('logs');
    const hypervisorActivity = document.getElementById('hypervisor-activity');
    const animationContainer = document.getElementById('animation-container');
    const hypervisorProcessing = document.getElementById('hypervisor-processing');
    
    // Resource blocks containers
    const cpuBlocks = document.getElementById('cpu-blocks');
    const ramBlocks = document.getElementById('ram-blocks');
    const diskBlocks = document.getElementById('disk-blocks');
    
    // Chart canvas
    const resourceChart = document.getElementById('resource-chart');
    
    // Modal elements
    const infoBtn = document.getElementById('info-btn');
    const infoModal = document.getElementById('info-modal');
    const closeModal = document.querySelector('.close-modal');
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    // Initialize resource blocks
    initializeResourceBlocks();
    
    // Initialize chart
    const chart = initResourceChart(resourceChart);
    
    // Event listeners for sliders
    cpuSlider.addEventListener('input', () => {
        cpuValue.textContent = cpuSlider.value;
    });
    
    ramSlider.addEventListener('input', () => {
        ramValue.textContent = ramSlider.value;
    });
    
    diskSlider.addEventListener('input', () => {
        diskValue.textContent = diskSlider.value;
    });

    // Event listeners for dynamic sliders
    dynamicCpuSlider.addEventListener('input', () => {
        dynamicCpuValue.textContent = dynamicCpuSlider.value;
    });

    dynamicRamSlider.addEventListener('input', () => {
        dynamicRamValue.textContent = dynamicRamSlider.value;
    });

    dynamicDiskSlider.addEventListener('input', () => {
        dynamicDiskValue.textContent = dynamicDiskSlider.value;
    });
    
    // Event listeners for VM actions
    createVmBtn.addEventListener('click', () => {
        createVM(
            document.getElementById('vm-name').value,
            parseInt(cpuSlider.value),
            parseInt(ramSlider.value),
            parseInt(diskSlider.value)
        );
    });
    
    startVmBtn.addEventListener('click', startVM);
    pauseVmBtn.addEventListener('click', pauseVM);
    suspendVmBtn.addEventListener('click', suspendVM);
    destroyVmBtn.addEventListener('click', destroyVM);
    applyResourcesBtn.addEventListener('click', applyResourceChanges);

    // Load simulation events
    increaseLoadBtn.addEventListener('click', () => changeVMLoad(true));
    decreaseLoadBtn.addEventListener('click', () => changeVMLoad(false));
    
    // VM selector change event
    vmSelector.addEventListener('change', () => {
        updateVMControls();
        updateDynamicResourceControls();
    });
    
    // Modal events
    infoBtn.addEventListener('click', () => {
        infoModal.classList.add('active');
    });
    
    closeModal.addEventListener('click', () => {
        infoModal.classList.remove('active');
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            infoModal.classList.remove('active');
        }
    });
    
    // Dark mode toggle
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }
    
    // Initialize the simulation
    updateResourceSummary();
    addLog('Virtualization simulator initialized', 'create');
    
    // Set up hypervisor animation interval
    setInterval(idleHypervisorAnimation, 5000);

    /**
     * Initialize resource blocks in the UI
     */
    function initializeResourceBlocks() {
        // Create CPU blocks
        for (let i = 0; i < HOST_RESOURCES.cpu; i++) {
            const block = document.createElement('div');
            block.className = 'resource-block cpu';
            block.dataset.index = i;
            cpuBlocks.appendChild(block);
        }
        
        // Create RAM blocks (each block represents 2GB)
        for (let i = 0; i < HOST_RESOURCES.ram / 2; i++) {
            const block = document.createElement('div');
            block.className = 'resource-block ram';
            block.dataset.index = i;
            ramBlocks.appendChild(block);
        }
        
        // Create Disk blocks (each block represents 50GB)
        for (let i = 0; i < HOST_RESOURCES.disk / 50; i++) {
            const block = document.createElement('div');
            block.className = 'resource-block disk';
            block.dataset.index = i;
            diskBlocks.appendChild(block);
        }
    }
    
    /**
     * Initialize resource chart
     * @param {HTMLCanvasElement} canvas - Canvas element for the chart
     * @returns {Object} - Chart context and methods
     */
    function initResourceChart(canvas) {
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 30;
        
        function drawChart() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculate percentages
            const cpuPercentage = (usedResources.cpu / HOST_RESOURCES.cpu) * 100;
            const ramPercentage = (usedResources.ram / HOST_RESOURCES.ram) * 100;
            const diskPercentage = (usedResources.disk / HOST_RESOURCES.disk) * 100;
            
            // Draw background
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#334155' : '#e2e8f0';
            ctx.fill();
            
            // Draw CPU segment
            drawSegment(0, cpuPercentage / 100 * Math.PI * 2, radius, getComputedStyle(document.documentElement).getPropertyValue('--cpu-color'));
            
            // Draw RAM segment
            drawSegment(cpuPercentage / 100 * Math.PI * 2, (cpuPercentage + ramPercentage) / 100 * Math.PI * 2, radius, getComputedStyle(document.documentElement).getPropertyValue('--ram-color'));
            
            // Draw Disk segment
            drawSegment((cpuPercentage + ramPercentage) / 100 * Math.PI * 2, (cpuPercentage + ramPercentage + diskPercentage) / 100 * Math.PI * 2, radius, getComputedStyle(document.documentElement).getPropertyValue('--disk-color'));
            
            // Draw center circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff';
            ctx.fill();
            
            // Draw text
            ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b';
            ctx.font = 'bold 16px Poppins';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const avgUsage = Math.round((cpuPercentage + ramPercentage + diskPercentage) / 3);
            ctx.fillText(`${avgUsage}%`, centerX, centerY - 10);
            ctx.font = '12px Poppins';
            ctx.fillText('Usage', centerX, centerY + 10);
            
            // Draw legend
            drawLegend();
        }
        
        function drawSegment(startAngle, endAngle, radius, color) {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }
        
        function drawLegend() {
            const legendItems = [
                { label: 'CPU', color: getComputedStyle(document.documentElement).getPropertyValue('--cpu-color') },
                { label: 'RAM', color: getComputedStyle(document.documentElement).getPropertyValue('--ram-color') },
                { label: 'Disk', color: getComputedStyle(document.documentElement).getPropertyValue('--disk-color') }
            ];
            
            const legendX = 20;
            let legendY = canvas.height - 80;
            
            legendItems.forEach(item => {
                // Draw color box
                ctx.fillStyle = item.color;
                ctx.fillRect(legendX, legendY, 15, 15);
                
                // Draw label
                ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b';
                ctx.font = '12px Poppins';
                ctx.textAlign = 'left';
                ctx.fillText(item.label, legendX + 25, legendY + 8);
                
                legendY += 20;
            });
        }
        
        // Initial draw
        drawChart();
        
        return {
            update: drawChart
        };
    }

    /**
     * Idle hypervisor animation to show it's always working
     */
    function idleHypervisorAnimation() {
        if (vms.length > 0 && !resourceChangeInProgress) {
            // Randomly select a VM to show small resource adjustments
            const randomVM = vms[Math.floor(Math.random() * vms.length)];
            if (randomVM.status === 'running') {
                // Create a subtle pulsing effect on the hypervisor
                const hypervisor = document.querySelector('.hypervisor-container');
                hypervisor.classList.add('hypervisor-active');
                
                // Show some activity in the hypervisor activity area
                showHypervisorActivity('Optimizing resources...', 'info');
                
                // Create small particles flowing between hypervisor and VM
                createSmallResourceFlow(randomVM.id, 'cpu');
                
                setTimeout(() => {
                    hypervisor.classList.remove('hypervisor-active');
                }, 2000);
            }
        }
    }

    /**
     * Show activity in the hypervisor activity area
     * @param {string} message - Activity message
     * @param {string} type - Activity type (info, warning, error)
     */
    function showHypervisorActivity(message, type = 'info') {
        const activity = document.createElement('div');
        activity.className = `hypervisor-message ${type}`;
        activity.textContent = message;
        
        hypervisorActivity.appendChild(activity);
        
        // Auto-remove after animation
        setTimeout(() => {
            activity.classList.add('fade-out');
            setTimeout(() => {
                activity.remove();
            }, 500);
        }, 2500);
    }
    
    /**
     * Create a new virtual machine
     * @param {string} name - VM name
     * @param {number} cpuCores - Number of CPU cores
     * @param {number} ramGB - Amount of RAM in GB
     * @param {number} diskGB - Amount of disk space in GB
     */
    function createVM(name, cpuCores, ramGB, diskGB) {
        // Validate name
        if (!name) name = `VM${vmCounter}`;
        
        // Check if we have enough resources
        if (!hasEnoughResources(cpuCores, ramGB, diskGB)) {
            addLog(`Failed to create ${name}: Not enough resources available`, 'destroy');
            showHypervisorActivity('Resource allocation failed: Insufficient resources', 'error');
            return;
        }
        
        // Start the hypervisor processing animation
        startHypervisorProcessing('Creating VM...');
        
        // Generate a color based on VM index
        const colorIndex = vms.length % 5;
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        
        // Create VM object
        const vm = {
            id: vmCounter++,
            name: name,
            cpu: cpuCores,
            ram: ramGB,
            disk: diskGB,
            status: 'initializing', // New status for initialization
            color: colors[colorIndex],
            load: 'idle', // Initial load level
            actualUsage: {
                cpu: cpuCores * VM_LOAD_LEVELS.idle,
                ram: ramGB * VM_LOAD_LEVELS.idle,
                disk: diskGB * VM_LOAD_LEVELS.idle
            }
        };
        
        // Add to VMs array
        vms.push(vm);
        
        // Show processing steps with delays for better visualization
        setTimeout(() => {
            showHypervisorActivity('Allocating CPU resources...', 'info');
            animateResourceAllocation('cpu', cpuCores);
        }, 500);
        
        setTimeout(() => {
            showHypervisorActivity('Allocating memory...', 'info');
            animateResourceAllocation('ram', ramGB);
        }, 1500);
        
        setTimeout(() => {
            showHypervisorActivity('Provisioning disk space...', 'info');
            animateResourceAllocation('disk', diskGB);
        }, 2500);
        
        setTimeout(() => {
            showHypervisorActivity('Initializing virtual hardware...', 'info');
        }, 3500);
        
        setTimeout(() => {
            showHypervisorActivity('Booting VM...', 'info');
            
            // Create VM placeholder with "initializing" state
            createVMElement(vm);
            
            // Update VM selector with initializing state
            updateVMSelector();
        }, 4500);
        
        setTimeout(() => {
            // Update resource usage now that the VM is fully created
            vm.status = 'running';
            updateResourceUsage();
            
            // Update the VM element to show it's running
            const vmElement = document.getElementById(`vm-${vm.id}`);
            if (vmElement) {
                vmElement.classList.remove('initializing');
                vmElement.querySelector('.vm-status').textContent = 'Running';
                vmElement.querySelector('.vm-status').classList.remove('initializing');
            }
            
            // Update VM selector
            updateVMSelector();
            
            // Finish hypervisor processing
            stopHypervisorProcessing();
            
            // Add log
            addLog(`Created ${vm.name} with ${vm.cpu} cores, ${vm.ram} GB RAM, ${vm.disk} GB disk`, 'create');
            
            // Update chart
            chart.update();
            
            // Reset VM name input
            document.getElementById('vm-name').value = `VM${vmCounter}`;
        }, 5500);
    }

    /**
     * Animate the allocation of resources from resource pool to hypervisor
     * @param {string} type - Resource type (cpu, ram, disk)
     * @param {number} amount - Amount of resource to allocate
     */
    function animateResourceAllocation(type, amount) {
        const sourceContainer = document.getElementById(`${type}-blocks`);
        const hypervisorElement = document.querySelector('.hypervisor-container');
        
        if (!sourceContainer || !hypervisorElement) return;
        
        const sourceRect = sourceContainer.getBoundingClientRect();
        const hypervisorRect = hypervisorElement.getBoundingClientRect();
        
        // Calculate start and end positions
        const startX = sourceRect.left + sourceRect.width / 2;
        const startY = sourceRect.top + sourceRect.height / 2;
        const endX = hypervisorRect.left + hypervisorRect.width / 2;
        const endY = hypervisorRect.top + hypervisorRect.height / 2;
        
        // Determine number of particles based on resource amount
        let particleCount;
        switch (type) {
            case 'cpu':
                particleCount = amount * 2; // 2 particles per core
                break;
            case 'ram':
                particleCount = amount; // 1 particle per GB
                break;
            case 'disk':
                particleCount = Math.ceil(amount / 50); // 1 particle per 50GB
                break;
            default:
                particleCount = 5;
        }
        
        // Create resource flow animation
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = `resource-particle ${type}`;
                
                // Random starting position within the source container
                const randomOffsetX = (Math.random() - 0.5) * sourceRect.width * 0.8;
                const randomOffsetY = (Math.random() - 0.5) * sourceRect.height * 0.8;
                
                particle.style.left = `${startX + randomOffsetX}px`;
                particle.style.top = `${startY + randomOffsetY}px`;
                
                animationContainer.appendChild(particle);
                
                // Set the end position for animation
                setTimeout(() => {
                    particle.style.left = `${endX}px`;
                    particle.style.top = `${endY}px`;
                    
                    // Remove particle after animation completes
                    setTimeout(() => {
                        particle.remove();
                        
                        // Update resource blocks when the last particle is removed
                        if (i === particleCount - 1) {
                            updateResourceBlocks();
                        }
                    }, 1000);
                }, 10);
            }, i * 100); // Stagger particle creation
        }
    }

    /**
     * Start the hypervisor processing animation
     * @param {string} task - Task description
     */
    function startHypervisorProcessing(task) {
        resourceChangeInProgress = true;
        
        // Add task to queue
        hypervisorProcessingQueue.push(task);
        
        // Create processing animation element if it doesn't exist
        if (!document.querySelector('.hypervisor-processing')) {
            const processingElement = document.createElement('div');
            processingElement.className = 'hypervisor-processing';
            processingElement.innerHTML = `
                <div class="processing-indicator">
                    <div class="processing-dot"></div>
                    <div class="processing-dot"></div>
                    <div class="processing-dot"></div>
                </div>
                <div class="processing-task">${task}</div>
            `;
            
            hypervisorProcessing.appendChild(processingElement);
        } else {
            // Update existing task
            document.querySelector('.processing-task').textContent = task;
        }
        
        // Add active class to hypervisor
        document.querySelector('.hypervisor-container').classList.add('hypervisor-active');
    }

    /**
     * Stop the hypervisor processing animation
     */
    function stopHypervisorProcessing() {
        // Remove from queue
        hypervisorProcessingQueue.shift();
        
        // If there are more tasks, start processing the next one
        if (hypervisorProcessingQueue.length > 0) {
            document.querySelector('.processing-task').textContent = hypervisorProcessingQueue[0];
            return;
        }
        
        // Remove processing element
        const processingElement = document.querySelector('.hypervisor-processing');
        if (processingElement) {
            processingElement.classList.add('fade-out');
            
            setTimeout(() => {
                processingElement.remove();
                
                // Remove active class from hypervisor
                document.querySelector('.hypervisor-container').classList.remove('hypervisor-active');
                
                // Set flag to false
                resourceChangeInProgress = false;
            }, 500);
        } else {
            resourceChangeInProgress = false;
        }
    }
    
    /**
     * Start a suspended VM with animation
     */
    function startVM() {
        const selectedVmId = parseInt(vmSelector.value);
        if (!selectedVmId) return;
        
        const vm = vms.find(vm => vm.id === selectedVmId);
        if (vm && vm.status === 'suspended') {
            // Check if we have enough resources
            if (!hasEnoughResources(vm.cpu, vm.ram, vm.disk)) {
                addLog(`Failed to start ${vm.name}: Not enough resources available`, 'destroy');
                showHypervisorActivity('Resource allocation failed: Insufficient resources', 'error');
                return;
            }
            
            // Start hypervisor processing
            startHypervisorProcessing(`Starting ${vm.name}...`);
            
            // Show staged animation for resuming VM
            setTimeout(() => {
                showHypervisorActivity('Allocating CPU & memory resources...', 'info');
                animateResourceAllocation('cpu', vm.cpu);
                animateResourceAllocation('ram', vm.ram);
            }, 500);
            
            setTimeout(() => {
                showHypervisorActivity('Restoring VM state...', 'info');
                
                // Update VM state
                vm.status = 'running';
                
                // Update VM element
                const vmElement = document.getElementById(`vm-${vm.id}`);
                vmElement.classList.remove('suspended');
                vmElement.querySelector('.vm-status').textContent = 'Running';
                vmElement.querySelector('.vm-status').classList.remove('suspended');
                
                // Update resource usage
                updateResourceUsage();
                
                // Add log
                addLog(`Started ${vm.name}`, 'start');
                
                // Update VM controls
                updateVMControls();
                
                // Update chart
                chart.update();
            }, 2000);
            
            setTimeout(() => {
                // Finish processing
                stopHypervisorProcessing();
                
                // Create VM activity animation
                showVmActivity(vm.id);
            }, 3000);
        }
    }
    
    /**
     * Pause a running VM with animation
     */
    function pauseVM() {
        const selectedVmId = parseInt(vmSelector.value);
        if (!selectedVmId) return;
        
        const vm = vms.find(vm => vm.id === selectedVmId);
        if (vm && vm.status === 'running') {
            // Start hypervisor processing
            startHypervisorProcessing(`Pausing ${vm.name}...`);
            
            setTimeout(() => {
                showHypervisorActivity('Pausing VM execution...', 'info');
                
                // Update VM state
                vm.status = 'paused';
                
                // Update VM element
                const vmElement = document.getElementById(`vm-${vm.id}`);
                vmElement.classList.add('paused');
                vmElement.classList.remove('suspended');
                vmElement.querySelector('.vm-status').textContent = 'Paused';
                vmElement.querySelector('.vm-status').classList.add('paused');
                vmElement.querySelector('.vm-status').classList.remove('suspended');
                
                // Add log
                addLog(`Paused ${vm.name}`, 'pause');
                
                // Update VM controls
                updateVMControls();
            }, 1000);
            
            setTimeout(() => {
                // Finish processing
                stopHypervisorProcessing();
            }, 2000);
        }
    }
    
    /**
     * Suspend a VM with animation (save to disk, free memory)
     */
    function suspendVM() {
        const selectedVmId = parseInt(vmSelector.value);
        if (!selectedVmId) return;
        
        const vm = vms.find(vm => vm.id === selectedVmId);
        if (vm && (vm.status === 'running' || vm.status === 'paused')) {
            // Start hypervisor processing
            startHypervisorProcessing(`Suspending ${vm.name}...`);
            
            setTimeout(() => {
                showHypervisorActivity('Saving VM state to disk...', 'info');
                
                // Create animation of resources flowing back to resource pools
                animateResourceRelease(vm, 'cpu');
                animateResourceRelease(vm, 'ram');
            }, 500);
            
            setTimeout(() => {
                showHypervisorActivity('Freeing memory resources...', 'info');
                
                // Update VM state
                vm.status = 'suspended';
                
                // Update VM element
                const vmElement = document.getElementById(`vm-${vm.id}`);
                vmElement.classList.remove('paused');
                vmElement.classList.add('suspended');
                vmElement.querySelector('.vm-status').textContent = 'Suspended';
                vmElement.querySelector('.vm-status').classList.remove('paused');
                vmElement.querySelector('.vm-status').classList.add('suspended');
                
                // Update resource usage (suspended VMs don't use CPU or RAM)
                updateResourceUsage();
                
                // Add log
                addLog(`Suspended ${vm.name} to disk`, 'suspend');
                
                // Update VM controls
                updateVMControls();
                
                // Update chart
                chart.update();
            }, 2000);
            
            setTimeout(() => {
                // Finish processing
                stopHypervisorProcessing();
            }, 3000);
        }
    }
    
    /**
     * Destroy a VM with enhanced animation
     */
    function destroyVM() {
        const selectedVmId = parseInt(vmSelector.value);
        if (!selectedVmId) return;
        
        const vmIndex = vms.findIndex(vm => vm.id === selectedVmId);
        if (vmIndex !== -1) {
            const vm = vms[vmIndex];
            
            // Start hypervisor processing
            startHypervisorProcessing(`Destroying ${vm.name}...`);
            
            // Show staged animation for destroying VM
            setTimeout(() => {
                showHypervisorActivity('Shutting down VM...', 'info');
                
                // Create animation of shutting down
                const vmElement = document.getElementById(`vm-${vm.id}`);
                vmElement.classList.add('shutting-down');
            }, 500);
            
            setTimeout(() => {
                showHypervisorActivity('Releasing resources...', 'info');
                
                // Create animation of resources flowing back to resource pools
                animateResourceRelease(vm, 'cpu');
                animateResourceRelease(vm, 'ram');
                animateResourceRelease(vm, 'disk');
            }, 1500);
            
            setTimeout(() => {
                showHypervisorActivity('Cleaning up...', 'info');
                
                // Remove VM from array
                vms.splice(vmIndex, 1);
                
                // Update resource usage
                updateResourceUsage();
                
                // Remove VM element with animation
                const vmElement = document.getElementById(`vm-${vm.id}`);
                vmElement.style.animation = 'vm-destroy 0.8s forwards';
                
                setTimeout(() => {
                    vmElement.remove();
                    
                    // Update VM selector
                    updateVMSelector();
                    
                    // Add log
                    addLog(`Destroyed ${vm.name}, resources reclaimed`, 'destroy');
                    
                    // Update chart
                    chart.update();
                    
                    // Show empty state if no VMs
                    if (vms.length === 0) {
                        const emptyState = document.createElement('div');
                        emptyState.className = 'empty-state';
                        emptyState.innerHTML = `
                            <p>No virtual machines running</p>
                            <p>Configure and create a VM to start</p>
                        `;
                        vmsContainer.appendChild(emptyState);
                    }
                    
                    // Finish processing
                    stopHypervisorProcessing();
                }, 1000);
            }, 3000);
        }
    }

    /**
     * Animate resource release from VM back to resource pool
     * @param {Object} vm - VM object
     * @param {string} type - Resource type (cpu, ram, disk)
     */
    function animateResourceRelease(vm, type) {
        const vmElement = document.getElementById(`vm-${vm.id}`);
        const targetContainer = document.getElementById(`${type}-blocks`);
        
        if (!vmElement || !targetContainer) return;
        
        const vmRect = vmElement.getBoundingClientRect();
        const targetRect = targetContainer.getBoundingClientRect();
        
        // Calculate start and end positions
        const startX = vmRect.left + vmRect.width / 2;
        const startY = vmRect.top + vmRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        
        // Determine number of particles based on resource amount
        let particleCount;
        switch (type) {
            case 'cpu':
                particleCount = vm.cpu * 2; // 2 particles per core
                break;
            case 'ram':
                particleCount = vm.ram; // 1 particle per GB
                break;
            case 'disk':
                particleCount = Math.ceil(vm.disk / 50); // 1 particle per 50GB
                break;
            default:
                particleCount = 5;
        }
        
        // Create resource flow animation
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = `resource-particle ${type} release`;
                
                // Random starting position near the VM
                const randomOffsetX = (Math.random() - 0.5) * vmRect.width * 0.8;
                const randomOffsetY = (Math.random() - 0.5) * vmRect.height * 0.8;
                
                particle.style.left = `${startX + randomOffsetX}px`;
                particle.style.top = `${startY + randomOffsetY}px`;
                
                animationContainer.appendChild(particle);
                
                // Set the end position for animation
                setTimeout(() => {
                    particle.style.left = `${endX}px`;
                    particle.style.top = `${endY}px`;
                    
                    // Remove particle after animation completes
                    setTimeout(() => {
                        particle.remove();
                        
                        // Update resource blocks when the last particle is removed
                        if (i === particleCount - 1) {
                            updateResourceBlocks();
                        }
                    }, 1000);
                }, 10);
            }, i * 50); // Stagger particle creation
        }
    }

    /**
     * Create a small resource flow animation for subtle hypervisor activity
     * @param {number} vmId - VM ID
     * @param {string} type - Resource type (cpu, ram, disk)
     */
    function createSmallResourceFlow(vmId, type) {
        const hypervisorElement = document.querySelector('.hypervisor-container');
        const vmElement = document.getElementById(`vm-${vmId}`);
        
        if (!hypervisorElement || !vmElement) return;
        
        const hypervisorRect = hypervisorElement.getBoundingClientRect();
        const vmRect = vmElement.getBoundingClientRect();
        
        // Calculate start and end positions
        const startX = hypervisorRect.left + hypervisorRect.width / 2;
        const startY = hypervisorRect.top + hypervisorRect.height / 2;
        const endX = vmRect.left + vmRect.width / 2;
        const endY = vmRect.top + vmRect.height / 2;
        
        // Create just a few particles for subtle effect
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = `resource-particle ${type} small`;
                
                particle.style.left = `${startX}px`;
                particle.style.top = `${startY}px`;
                
                animationContainer.appendChild(particle);
                
                // Set the end position for animation
                setTimeout(() => {
                    particle.style.left = `${endX}px`;
                    particle.style.top = `${endY}px`;
                    
                    // Remove particle after animation completes
                    setTimeout(() => {
                        particle.remove();
                    }, 800);
                }, 10);
            }, i * 200); // Stagger particle creation
        }
    }

    /**
     * Create VM activity animation
     * @param {number} vmId - VM ID
     */
    function showVmActivity(vmId) {
        const vmElement = document.getElementById(`vm-${vmId}`);
        if (!vmElement) return;
        
        // Add activity pulse
        vmElement.classList.add('vm-active');
        
        setTimeout(() => {
            vmElement.classList.remove('vm-active');
        }, 2000);
    }
    
    /**
     * Update VM controls based on selected VM
     */
    function updateVMControls() {
        const selectedVmId = parseInt(vmSelector.value);
        
        if (!selectedVmId) {
            startVmBtn.disabled = true;
            pauseVmBtn.disabled = true;
            suspendVmBtn.disabled = true;
            destroyVmBtn.disabled = true;
            increaseLoadBtn.disabled = true;
            decreaseLoadBtn.disabled = true;
            return;
        }
        
        const vm = vms.find(vm => vm.id === selectedVmId);
        if (vm) {
            startVmBtn.disabled = vm.status !== 'suspended';
            pauseVmBtn.disabled = vm.status !== 'running';
            suspendVmBtn.disabled = vm.status === 'suspended';
            destroyVmBtn.disabled = false;
            
            // Load buttons only enabled for running VMs
            increaseLoadBtn.disabled = vm.status !== 'running' || vm.load === 'max';
            decreaseLoadBtn.disabled = vm.status !== 'running' || vm.load === 'idle';
        }
    }

    /**
     * Update dynamic resource sliders based on selected VM
     */
    function updateDynamicResourceControls() {
        const selectedVmId = parseInt(vmSelector.value);
        
        // Reset and disable sliders if no VM is selected
        if (!selectedVmId) {
            dynamicCpuSlider.value = 2;
            dynamicRamSlider.value = 4;
            dynamicDiskSlider.value = 100;
            dynamicCpuValue.textContent = 2;
            dynamicRamValue.textContent = 4;
            dynamicDiskValue.textContent = 100;
            
            dynamicCpuSlider.disabled = true;
            dynamicRamSlider.disabled = true;
            dynamicDiskSlider.disabled = true;
            applyResourcesBtn.disabled = true;
            return;
        }
        
        const vm = vms.find(vm => vm.id === selectedVmId);
        if (vm) {
            // Set slider values to current VM resources
            dynamicCpuSlider.value = vm.cpu;
            dynamicRamSlider.value = vm.ram;
            dynamicDiskSlider.value = vm.disk;
            dynamicCpuValue.textContent = vm.cpu;
            dynamicRamValue.textContent = vm.ram;
            dynamicDiskValue.textContent = vm.disk;
            
            // Enable sliders for running or paused VMs
            const canAdjust = vm.status === 'running' || vm.status === 'paused';
            dynamicCpuSlider.disabled = !canAdjust;
            dynamicRamSlider.disabled = !canAdjust;
            dynamicDiskSlider.disabled = !canAdjust;
            applyResourcesBtn.disabled = !canAdjust;
        }
    }

    /**
     * Apply resource changes to a running VM
     */
    function applyResourceChanges() {
        const selectedVmId = parseInt(vmSelector.value);
        if (!selectedVmId) return;
        
        const vm = vms.find(vm => vm.id === selectedVmId);
        if (!vm || (vm.status !== 'running' && vm.status !== 'paused')) return;
        
        // Get new values
        const newCpu = parseInt(dynamicCpuSlider.value);
        const newRam = parseInt(dynamicRamSlider.value);
        const newDisk = parseInt(dynamicDiskSlider.value);
        
        // Check if there are any changes
        if (newCpu === vm.cpu && newRam === vm.ram && newDisk === vm.disk) {
            showHypervisorActivity('No changes to apply', 'info');
            return;
        }
        
        // Calculate additional resources needed
        const additionalCpu = Math.max(0, newCpu - vm.cpu);
        const additionalRam = Math.max(0, newRam - vm.ram);
        const additionalDisk = Math.max(0, newDisk - vm.disk);
        
        // Check if we have enough resources for increases
        const currentUsed = { ...usedResources };
        if (additionalCpu > 0 || additionalRam > 0 || additionalDisk > 0) {
            // Temporarily subtract current VM usage to check if additional resources are available
            currentUsed.cpu -= vm.cpu;
            currentUsed.ram -= vm.ram;
            currentUsed.disk -= vm.disk;
            
            if (
                currentUsed.cpu + newCpu > HOST_RESOURCES.cpu ||
                currentUsed.ram + newRam > HOST_RESOURCES.ram ||
                currentUsed.disk + newDisk > HOST_RESOURCES.disk
            ) {
                addLog(`Failed to resize ${vm.name}: Not enough resources available`, 'destroy');
                showHypervisorActivity('Resource allocation failed: Insufficient resources', 'error');
                return;
            }
        }
        
        // Start hypervisor processing
        startHypervisorProcessing(`Resizing ${vm.name}...`);
        
        // Animate resource changes
        
        // For resources being increased
        setTimeout(() => {
            if (additionalCpu > 0) {
                showHypervisorActivity('Allocating additional CPU cores...', 'info');
                animateResourceAllocation('cpu', additionalCpu);
            }
            
            if (additionalRam > 0) {
                showHypervisorActivity('Allocating additional memory...', 'info');
                animateResourceAllocation('ram', additionalRam);
            }
            
            if (additionalDisk > 0) {
                showHypervisorActivity('Extending disk space...', 'info');
                animateResourceAllocation('disk', additionalDisk);
            }
        }, 500);
        
        // For resources being decreased
        setTimeout(() => {
            if (newCpu < vm.cpu) {
                showHypervisorActivity('Releasing CPU cores...', 'info');
                animateResourceRelease({ id: vm.id, cpu: vm.cpu - newCpu }, 'cpu');
            }
            
            if (newRam < vm.ram) {
                showHypervisorActivity('Releasing memory...', 'info');
                animateResourceRelease({ id: vm.id, ram: vm.ram - newRam }, 'ram');
            }
            
            if (newDisk < vm.disk) {
                showHypervisorActivity('Shrinking disk space...', 'info');
                animateResourceRelease({ id: vm.id, disk: vm.disk - newDisk }, 'disk');
            }
        }, 1500);
        
        // Apply changes after animations
        setTimeout(() => {
            showHypervisorActivity('Applying configuration changes...', 'info');
            
            // Update VM object
            vm.cpu = newCpu;
            vm.ram = newRam;
            vm.disk = newDisk;
            
            // Update VM's actual usage based on current load level
            const loadLevel = VM_LOAD_LEVELS[vm.load];
            vm.actualUsage = {
                cpu: vm.cpu * loadLevel,
                ram: vm.ram * loadLevel,
                disk: vm.disk
            };
            
            // Update VM element
            updateVMElement(vm);
            
            // Update resource usage
            updateResourceUsage();
            
            // Add log
            addLog(`Resized ${vm.name} to ${vm.cpu} cores, ${vm.ram} GB RAM, ${vm.disk} GB disk`, 'create');
            
            // Update chart
            chart.update();
        }, 3000);
        
        // Finish the process
        setTimeout(() => {
            showHypervisorActivity('Resource adjustment complete', 'info');
            stopHypervisorProcessing();
            
            // Show VM activity
            showVmActivity(vm.id);
        }, 4000);
    }

    /**
     * Update a VM element in the DOM
     * @param {Object} vm - The VM object
     */
    function updateVMElement(vm) {
        const vmElement = document.getElementById(`vm-${vm.id}`);
        if (!vmElement) return;
        
        // Update resource display
        const cpuElement = vmElement.querySelector('.vm-resource:nth-child(1) span:last-child');
        const ramElement = vmElement.querySelector('.vm-resource:nth-child(2) span:last-child');
        const diskElement = vmElement.querySelector('.vm-resource:nth-child(3) span:last-child');
        
        // Clear and update with new values
        if (cpuElement) {
            cpuElement.textContent = '';
            setTimeout(() => {
                cpuElement.textContent = `${vm.cpu} cores`;
            }, 50);
        }
        if (ramElement) {
            ramElement.textContent = '';
            setTimeout(() => {
                ramElement.textContent = `${vm.ram} GB`;
            }, 50);
        }
        if (diskElement) {
            diskElement.textContent = '';
            setTimeout(() => {
                diskElement.textContent = `${vm.disk} GB`;
            }, 50);
        }
        
        // Add resize animation
        vmElement.classList.add('resizing');
        setTimeout(() => {
            vmElement.classList.remove('resizing');
        }, 1000);
    }

    /**
     * Change the load level of a running VM
     * @param {boolean} increase - Whether to increase or decrease load
     */
    function changeVMLoad(increase) {
        const selectedVmId = parseInt(vmSelector.value);
        if (!selectedVmId) return;
        
        const vm = vms.find(vm => vm.id === selectedVmId);
        if (!vm || vm.status !== 'running') return;
        
        const loadLevels = ['idle', 'low', 'medium', 'high', 'max'];
        const currentIndex = loadLevels.indexOf(vm.load);
        
        // Determine new load level
        let newIndex;
        if (increase) {
            newIndex = Math.min(currentIndex + 1, loadLevels.length - 1);
        } else {
            newIndex = Math.max(currentIndex - 1, 0);
        }
        
        // No change needed
        if (newIndex === currentIndex) return;
        
        const newLoad = loadLevels[newIndex];
        const newLoadValue = VM_LOAD_LEVELS[newLoad];
        
        // Start hypervisor processing
        startHypervisorProcessing(`Adjusting ${vm.name} load...`);
        
        // Show activity in the VM
        setTimeout(() => {
            if (increase) {
                showHypervisorActivity(`Increasing ${vm.name} workload...`, 'info');
            } else {
                showHypervisorActivity(`Decreasing ${vm.name} workload...`, 'info');
            }
            
            // Animate load change
            animateLoadChange(vm, increase);
        }, 500);
        
        // Update VM after animation
        setTimeout(() => {
            // Update VM load
            vm.load = newLoad;
            
            // Update actual resource usage based on new load
            vm.actualUsage = {
                cpu: vm.cpu * newLoadValue,
                ram: vm.ram * newLoadValue,
                disk: vm.disk
            };
            
            // Update VM element appearance
            const vmElement = document.getElementById(`vm-${vm.id}`);
            if (vmElement) {
                // Remove any existing load classes
                loadLevels.forEach(level => {
                    vmElement.classList.remove(`load-${level}`);
                });
                
                // Add new load class
                vmElement.classList.add(`load-${newLoad}`);
                
                // Add usage indicators
                updateVMUsageIndicators(vm);
            }
            
            // Add log
            addLog(`${vm.name} workload changed to ${newLoad.toUpperCase()}`, 'info');
            
            // Update controls (enable/disable load buttons)
            updateVMControls();
            
            // Show VM activity
            showVmActivity(vm.id);
        }, 2000);
        
        // Finish the process
        setTimeout(() => {
            stopHypervisorProcessing();
        }, 2500);
    }

    /**
     * Animate load change
     * @param {Object} vm - VM object
     * @param {boolean} increase - Whether load is increasing or decreasing
     */
    function animateLoadChange(vm, increase) {
        const vmElement = document.getElementById(`vm-${vm.id}`);
        const hypervisorElement = document.querySelector('.hypervisor-container');
        
        if (!vmElement || !hypervisorElement) return;
        
        const vmRect = vmElement.getBoundingClientRect();
        const hypervisorRect = hypervisorElement.getBoundingClientRect();
        
        // Calculate positions
        const vmX = vmRect.left + vmRect.width / 2;
        const vmY = vmRect.top + vmRect.height / 2;
        const hypervisorX = hypervisorRect.left + hypervisorRect.width / 2;
        const hypervisorY = hypervisorRect.top + hypervisorRect.height / 2;
        
        // Number of particles based on change
        const particleCount = increase ? 8 : 4;
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                
                if (increase) {
                    // Resource flowing from hypervisor to VM
                    particle.className = 'resource-particle cpu small';
                    particle.style.left = `${hypervisorX}px`;
                    particle.style.top = `${hypervisorY}px`;
                    
                    animationContainer.appendChild(particle);
                    
                    // Animate to VM
                    setTimeout(() => {
                        particle.style.left = `${vmX}px`;
                        particle.style.top = `${vmY}px`;
                        
                        // Remove particle after animation
                        setTimeout(() => {
                            particle.remove();
                        }, 800);
                    }, 10);
                } else {
                    // Resource flowing from VM to hypervisor (lightening load)
                    particle.className = 'resource-particle cpu small release';
                    particle.style.left = `${vmX}px`;
                    particle.style.top = `${vmY}px`;
                    
                    animationContainer.appendChild(particle);
                    
                    // Animate to hypervisor
                    setTimeout(() => {
                        particle.style.left = `${hypervisorX}px`;
                        particle.style.top = `${hypervisorY}px`;
                        
                        // Remove particle after animation
                        setTimeout(() => {
                            particle.remove();
                        }, 800);
                    }, 10);
                }
            }, i * 100);
        }
    }

    /**
     * Update VM usage indicators
     * @param {Object} vm - VM object
     */
    function updateVMUsageIndicators(vm) {
        const vmElement = document.getElementById(`vm-${vm.id}`);
        if (!vmElement) return;
        
        // Check if usage indicators exist, if not, create them
        let usageContainer = vmElement.querySelector('.vm-usage-indicators');
        if (!usageContainer) {
            usageContainer = document.createElement('div');
            usageContainer.className = 'vm-usage-indicators';
            vmElement.appendChild(usageContainer);
            
            // Create indicators for each resource
            usageContainer.innerHTML = `
                <div class="vm-usage-indicator">
                    <div class="vm-usage-icon cpu"></div>
                    <div class="vm-usage-bar">
                        <div class="vm-usage-progress cpu" style="width: 0%"></div>
                    </div>
                </div>
                <div class="vm-usage-indicator">
                    <div class="vm-usage-icon ram"></div>
                    <div class="vm-usage-bar">
                        <div class="vm-usage-progress ram" style="width: 0%"></div>
                    </div>
                </div>
            `;
        }
        
        // Update progress bars based on load
        const cpuProgress = vmElement.querySelector('.vm-usage-progress.cpu');
        const ramProgress = vmElement.querySelector('.vm-usage-progress.ram');
        
        if (cpuProgress && ramProgress) {
            const loadLevel = VM_LOAD_LEVELS[vm.load];
            cpuProgress.style.width = `${loadLevel * 100}%`;
            ramProgress.style.width = `${loadLevel * 100}%`;
        }
    }
    
    /**
     * Update VM selector dropdown
     */
    function updateVMSelector() {
        // Clear current options
        vmSelector.innerHTML = '<option value="">Select a VM</option>';
        
        // Add options for each VM
        vms.forEach(vm => {
            const option = document.createElement('option');
            option.value = vm.id;
            option.textContent = `${vm.name} (${vm.status})`;
            vmSelector.appendChild(option);
        });
        
        // Enable/disable selector
        vmSelector.disabled = vms.length === 0;
        
        // Update controls
        updateVMControls();
        updateDynamicResourceControls();
    }
    
    /**
     * Create a VM element in the DOM with animation
     * @param {Object} vm - The VM object
     */
    function createVMElement(vm) {
        // Remove empty state if it exists
        const emptyState = vmsContainer.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        const vmElement = document.createElement('div');
        vmElement.id = `vm-${vm.id}`;
        vmElement.className = 'vm';
        
        // Add status class if not running
        if (vm.status === 'initializing') {
            vmElement.classList.add('initializing');
        } else if (vm.status === 'paused') {
            vmElement.classList.add('paused');
        } else if (vm.status === 'suspended') {
            vmElement.classList.add('suspended');
        }
        
        vmElement.style.borderTop = `4px solid ${vm.color}`;
        
        vmElement.innerHTML = `
            <div class="vm-header">
                <div class="vm-name">${vm.name}</div>
                <div class="vm-status ${vm.status}">${vm.status.charAt(0).toUpperCase() + vm.status.slice(1)}</div>
            </div>
            <div class="vm-resources">
                <div class="vm-resource">
                    <div class="vm-resource-label">
                        <div class="vm-resource-icon cpu"></div>
                        <span>CPU:</span>
                    </div>
                    <span>${vm.cpu} cores</span>
                </div>
                <div class="vm-resource">
                    <div class="vm-resource-label">
                        <div class="vm-resource-icon ram"></div>
                        <span>RAM:</span>
                    </div>
                    <span>${vm.ram} GB</span>
                </div>
                <div class="vm-resource">
                    <div class="vm-resource-label">
                        <div class="vm-resource-icon disk"></div>
                        <span>Disk:</span>
                    </div>
                    <span>${vm.disk} GB</span>
                </div>
            </div>
        `;
        
        vmsContainer.appendChild(vmElement);
        
        // Add usage indicators if the VM is running
        if (vm.status === 'running') {
            updateVMUsageIndicators(vm);
        }
    }
    
    /**
     * Update resource usage and UI
     */
    function updateResourceUsage() {
        // Reset used resources
        usedResources = {
            cpu: 0,
            ram: 0,
            disk: 0
        };
        
        // Calculate total used resources from running VMs
        vms.forEach(vm => {
            // Suspended VMs only use disk space
            if (vm.status === 'running' || vm.status === 'paused') {
                usedResources.cpu += vm.cpu;
                usedResources.ram += vm.ram;
            }
            
            // All VMs use disk space
            usedResources.disk += vm.disk;
        });
        
        // Update resource summary
        updateResourceSummary();
        
        // Update resource blocks
        updateResourceBlocks();
    }
    
    /**
     * Update resource summary text
     */
    function updateResourceSummary() {
        cpuSummary.textContent = `${usedResources.cpu}/${HOST_RESOURCES.cpu} cores`;
        ramSummary.textContent = `${usedResources.ram}/${HOST_RESOURCES.ram} GB`;
        diskSummary.textContent = `${usedResources.disk}/${HOST_RESOURCES.disk} GB`;
    }
    
    /**
     * Update resource blocks visualization
     */
    function updateResourceBlocks() {
        // Update CPU blocks
        const cpuBlockElements = cpuBlocks.querySelectorAll('.resource-block');
        cpuBlockElements.forEach((block, index) => {
            if (index < usedResources.cpu) {
                block.classList.add('allocated');
            } else {
                block.classList.remove('allocated');
            }
        });
        
        // Update RAM blocks (each block represents 2GB)
        const ramBlockElements = ramBlocks.querySelectorAll('.resource-block');
        const ramBlocksUsed = Math.ceil(usedResources.ram / 2);
        ramBlockElements.forEach((block, index) => {
            if (index < ramBlocksUsed) {
                block.classList.add('allocated');
            } else {
                block.classList.remove('allocated');
            }
        });
        
        // Update Disk blocks (each block represents 50GB)
        const diskBlockElements = diskBlocks.querySelectorAll('.resource-block');
        const diskBlocksUsed = Math.ceil(usedResources.disk / 50);
        diskBlockElements.forEach((block, index) => {
            if (index < diskBlocksUsed) {
                block.classList.add('allocated');
            } else {
                block.classList.remove('allocated');
            }
        });
    }
    
    /**
     * Check if there are enough resources to create/start a VM
     * @param {number} cpuCores - Number of CPU cores
     * @param {number} ramGB - Amount of RAM in GB
     * @param {number} diskGB - Amount of disk space in GB
     * @returns {boolean} - True if enough resources are available
     */
    function hasEnoughResources(cpuCores, ramGB, diskGB) {
        return (
            usedResources.cpu + cpuCores <= HOST_RESOURCES.cpu &&
            usedResources.ram + ramGB <= HOST_RESOURCES.ram &&
            usedResources.disk + diskGB <= HOST_RESOURCES.disk
        );
    }
    
    /**
     * Add a log entry
     * @param {string} message - Log message
     * @param {string} type - Log type (create, start, pause, suspend, destroy, info)
     */
    function addLog(message, type) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        logsContainer.insertBefore(logEntry, logsContainer.firstChild);
    }
    
    /**
     * Toggle dark mode
     */
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', 'disabled');
        }
        
        // Update chart with new theme colors
        chart.update();
    }
});
