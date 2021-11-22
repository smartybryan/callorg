
function setupTreeStructure() {
	apiCall("callings", "org=" + ALL_ORGS, setupTreeStructure_callback);
}

function setupTreeStructure_callback(response) {
	const wardOrgs = document.getElementById("ward-organizations");

	function setupNestedContainers(containerName, parentContainer, orgContainer, containerId) {
		let caret = document.createElement("span");
		caret.classList.add("caret");
		caret.innerText = containerName;
		orgContainer.appendChild(caret);
		parentContainer.appendChild(orgContainer);

		let nested = document.createElement("ul");
		nested.classList.add("nested");
		nested.setAttribute("id", containerId);
		orgContainer.appendChild(nested);
		return nested;
	}

	let counter = 0;
	let jsonObject = JSON.parse(response);
	jsonObject.forEach(function (calling) {
		counter++;
		let orgContainer = document.getElementById(calling.Org);
		if (!orgContainer) {
			let containerId = calling.Org;
			orgContainer = document.createElement("li");
			orgContainer = setupNestedContainers(calling.Org, wardOrgs, orgContainer, containerId);
		}

		if (calling.SubOrg !== "") {
			let containerId = calling.Org + "@" + calling.SubOrg;
			let subOrgContainer = document.getElementById(containerId);
			if (!subOrgContainer) {
				subOrgContainer = document.createElement("li");
				subOrgContainer.setAttribute("id", calling.SubOrg)
				orgContainer = setupNestedContainers(calling.SubOrg, orgContainer, subOrgContainer, containerId);
			} else {
				orgContainer = subOrgContainer;
			}
		}
		orgContainer.classList.add("leaf-container")
		orgContainer.setAttribute("ondrop", "drop(event)")
		orgContainer.setAttribute("ondragover", "allowDrop(event)")
		orgContainer.setAttribute("ondragstart", "drag(event)")
	});

	startTreeListeners();
	refreshFromModel();
	expandCollapseTree('c');
}

function startTreeListeners() {
	let caret = document.getElementsByClassName("caret");
	let i;

	for (i = 0; i < caret.length; i++) {
		caret[i].addEventListener("click", function () {
			if (this.innerText === ALL_ORGS) {
				toggleElement(this);
			} else {
				expandChildren(this);
			}
		});
	}
}

function expandCollapseTree(op) {
	let caret = document.getElementsByClassName("caret");
	let i;

	for (i = 0; i < caret.length; i++) {
		switch (op) {
			case 'e':
				caret[i].parentElement.querySelector(".nested").classList.add("active");
				caret[i].classList.add("caret-down");
				break;
			case 'c':
				caret[i].parentElement.querySelector(".nested").classList.remove("active");
				caret[i].classList.remove("caret-down");
				break;
		}
	}
	// expand all organizations by default
	if (op === 'c') {
		toggleElement(document.getElementById("ward-organizations"));
	}
}

function expandChildren(element) {
	let toggler = element.parentElement.getElementsByClassName("caret");
	let i;
	for (i = 0; i < toggler.length; i++) {
		toggleElement(toggler[i]);
	}
}

function toggleElement(element) {
	element.parentElement.querySelector(".nested").classList.toggle("active");
	element.classList.toggle("caret-down");
}


//// refresh functions ////

function refreshFromModel() {
	refreshTree();
	refreshCallingChanges();
}

function createCallingElement(calling, counter) {
	let callingInfo = document.createElement("li");
	callingInfo.setAttribute("id", callingId(calling.Name, calling.Holder, counter));
	callingInfo.setAttribute("data-org", calling.Org);
	callingInfo.setAttribute("draggable", "true");
	callingInfo.classList.add("calling-row");
	if (calling.Holder === VACANT) {
		callingInfo.classList.add("vacant");
	}
	callingInfo.innerHTML = callingInnards(calling.Name, calling.Holder, calling.PrintableTimeInCalling);
	return callingInfo;
}

//// refresh ////

function refreshTree() {
	let showNewVacancies = document.getElementById("new-vacancies").checked

	let endpoint = "callings";
	let params = "org=" + ALL_ORGS;
	if (showNewVacancies) {
		endpoint = "diff";
		params = "";
	}
	apiCall(endpoint, params, refreshTree_callback)
}

function refreshTree_callback(response) {
	let showNewVacancies = document.getElementById("new-vacancies").checked
	let showAllVacancies = document.getElementById("all-vacancies").checked

	let counter = 0;
	let jsonObject = JSON.parse(response);
	let workingObjects = jsonObject;
	if (showNewVacancies) {
		workingObjects = jsonObject.NewVacancies;
	}

	// clear all organizations
	let leafContainers = document.getElementsByClassName("leaf-container");
	for (let leafContainer of leafContainers) {
		clearContainer(leafContainer);
	}

	// repopulate organizations
	workingObjects.forEach(function (calling) {
		if (showAllVacancies && calling.Holder != VACANT) {
			return;
		}
		counter++;
		let container = findContainerFromCalling(calling);
		container.appendChild(createCallingElement(calling, counter));
	});
}

function refreshCallingChanges() {
	apiCall("diff", "", refreshCallingChanges_callback)
}

function refreshCallingChanges_callback(response) {
	let jsonObject = JSON.parse(response);

	document.getElementById("model-name").value = jsonObject.ModelName;

	let container = document.getElementById("releases");
	clearContainer(container);
	addReleaseDropEnabler(container);
	jsonObject.Releases.forEach(function (calling) {
		container.appendChild(createCallingElement(calling, 0));
	});

	container = document.getElementById("sustainings");
	clearContainer(container);
	jsonObject.Sustainings.forEach(function (calling) {
		container.appendChild(createCallingElement(calling, 0));
	});
}

function addReleaseDropEnabler(container) {
	let dropEnabler = document.createElement("li");
	dropEnabler.innerHTML = RELEASE_DROP_ENABLER;
	container.appendChild(dropEnabler);
}

function findContainerFromCalling(calling) {
	if (calling.SubOrg !== "") {
		return document.getElementById(calling.Org + "@" + calling.SubOrg);
	} else {
		return document.getElementById(calling.Org);
	}
}