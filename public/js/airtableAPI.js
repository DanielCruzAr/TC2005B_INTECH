async function fetchAirtableData(id_proyecto) {
    try {
        const res = await fetch(`https://natgas-project-manager.uc.r.appspot.com/proyecto/${id_proyecto}/airtable_data`); //cambiar dirección
        let data = await res.json();
        data = JSON.parse(data);
        sessionStorage.setItem(`airtable-data-${id_proyecto}`, JSON.stringify(data.body));
    } catch (error) {
        console.log(error);
    }
}


async function getAirtableData(id_proyecto, filterIT = true, forceFetch = false) {
    let data = {}
    // Try to retreive data from local storage
    data = sessionStorage.getItem(`airtable-data-${id_proyecto}`);
    if (data == null || data == 'undefined' || forceFetch) {
        // Fetch data from server
        await fetchAirtableData(id_proyecto);
        data = sessionStorage.getItem(`airtable-data-${id_proyecto}`);
    }
    if (data == 'undefined' || data == undefined){ return [] }
    data = JSON.parse(data);
    // Filter iterations
    let projectData = localStorage.getItem(`proyecto_${id_proyecto}`);
    if ((projectData != null || projectData != 'undefined') && filterIT) {
        projectData = JSON.parse(projectData);
        try {
            const iteration = projectData.iteracionActual;
            if (iteration != 'TODOS') {
                data = data.filter(row => ('Iterations' in row) ? row.Iterations == iteration : false);
            }
        } catch (error) {
            console.log(error);
            return null;
        }
    }
    return airtableDataValidator(data);
}


function airtableDataValidator(rows) {
    for (let i = 0; i < rows.length; i++) {
        if (!('Estimation' in rows[i])) {
            rows[i]['Estimation'] = null;
        }
        if (!('Status' in rows[i])) {
            rows[i]['Status'] = 'To Do';
        }
        if (!('Duration' in rows[i])) {
            rows[i]['Duration'] = null;
        }
        if (!('EstimatedFinishDate' in rows[i])) {
            rows[i]['EstimatedFinishDate'] = null;
        }
        if (!('FinishedDate' in rows[i])) {
            rows[i]['FinishedDate'] = null;
        }
        if (!('Iterations' in rows[i])) {
            rows[i]['Iterations'] = ['1'];
        }
        if (!('Assigned' in rows[i])) {
            rows[i]['Assigned'] = [];
        }
        if (!('IdTareaCasoUso' in rows[i])) {
            rows[i]['IdTareaCasoUso'] = null;
        }
        if (!('IdTareaCasoUso' in rows[i])) {
            rows[i]['IdTareaCasoUso'] = null;
        }
        if (!('IdCasoUso' in rows[i])) {
            rows[i]['IdCasoUso'] = null;
        }
        if (!('RecordId' in rows[i])) {
            rows[i]['RecordId'] = null;
        }
    }
    return rows;
}


async function getTareasDB(id_proyecto, filterIT = true) {
    let data = {}
    data = await fetch(`https://natgas-project-manager.uc.r.appspot.com/proyecto/${id_proyecto}/db_data`);
    data = await data.json();
    data = JSON.parse(data);
    // Filter iterations
    let projectData = localStorage.getItem(`proyecto_${id_proyecto}`);
    if ((projectData != null || projectData != 'undefined') && filterIT) {
        projectData = JSON.parse(projectData);
        try {
            const iteration = projectData.iteracionActual;
            if (iteration != 'TODOS') {
                data = data.filter(row => ('iteracion_caso' in row) ? row.iteracion_caso == iteration : false);
            }
        } catch (error) {
            console.log(error);
            return null;
        }
    }
    return data;
}


async function sincronizeAirtable(id_proyecto) {
    let airtable_data = null;
    try {
        // FETCH ALL DATA IN AIRTABLE
        airtable_data = await getAirtableData(id_proyecto, false, true);
    } catch {
        location.reload();
        return;
    }

    // FETCH ESTIMACIONES FROM LOCALSTORAGE
    let proyecto_data = localStorage.getItem(`proyecto_${id_proyecto}`);
    if (proyecto_data != null) {
        proyecto_data = JSON.parse(proyecto_data);
    }

    // FETCH TAREAS IN DATABASE
    let tareasDB = await getTareasDB(id_proyecto);
    if (tareasDB == null){
        tareasDB = [];
    }

    // MERGE BOTH DATA
    // .. change airtable data from array to dict with id row as key
    let tareasAirtable = {}
    for (let i = 0; i < airtable_data.length; i++) {
        if (airtable_data[i]['IdTareaCasoUso'] != undefined) {
            tareasAirtable[airtable_data[i]['IdTareaCasoUso']] = airtable_data[i];
        }
    }

    // .. loop all rows in db data
    let i = 0;
    let updateAirtable = {};
    let insertAirtable = [];
    let updateDB = [];

    while (i < tareasDB.length) {
        // Search for id in airtable dict
        let dbId = tareasDB[i].id_tareaCasoUso;
        // Check if it exists db ID in airtable
        if (dbId in tareasAirtable) {
            // Update airtable data
            if (tareasDB[i].fechaInicio_caso != null) {
                tareasDB[i].fechaInicio_caso = tareasDB[i].fechaInicio_caso.slice(0, 10);
            }
            if (tareasDB[i].fechaFinalizacion_caso != null) {
                tareasDB[i].fechaFinalizacion_caso = tareasDB[i].fechaFinalizacion_caso.slice(0, 10);
            }

            updateAirtable[dbId] = {};
            updateAirtable[dbId]['Name'] = `IT${tareasDB[i].iteracion_caso} - ${tareasDB[i].nombre_caso} - ${tareasDB[i].nombre_tarea} `;
            updateAirtable[dbId]['Iterations'] = tareasDB[i].iteracion_caso;
            updateAirtable[dbId]['IdCasoUso'] = tareasDB[i].id_casoUso;
            updateAirtable[dbId]['RecordId'] = tareasAirtable[dbId].RecordId;
            if('estimaciones' in proyecto_data){
                updateAirtable[dbId]['Estimation'] = proyecto_data['estimaciones'][tareasDB[i].id_tarea][tareasDB[i].id_casoUso];
            }

            // Update DB data
            let newRowDB = {};
            newRowDB['id_tareaCasoUso'] = tareasDB[i].id_tareaCasoUso;
            newRowDB['id_tarea'] = tareasDB[i].id_tarea;
            newRowDB['estado_tareaCasoUso'] = tareasAirtable[dbId].Status;
            newRowDB['tiempo_tarea'] = tareasAirtable[dbId].Duration / 3600;
            if (tareasAirtable[dbId].Duration == null) {
                newRowDB['tiempo_tarea'] = 0;
            }
            updateDB.push(newRowDB);

            delete tareasAirtable[dbId];
        }

        // .... if exists in db but not in airtable: INSERT AIRTABLE
        else {
            // ...... queue an instruction to add row in airtable
            if (tareasDB[i].fechaInicio_caso != null) {
                tareasDB[i].fechaInicio_caso = tareasDB[i].fechaInicio_caso.slice(0, 10);
            }
            if (tareasDB[i].fechaFinalizacion_caso != null) {
                tareasDB[i].fechaFinalizacion_caso = tareasDB[i].fechaFinalizacion_caso.slice(0, 10);
            }

            let temp = {};
            temp['fields'] = {
                'Name': `IT${tareasDB[i].iteracion_caso} - ${tareasDB[i].nombre_caso} - ${tareasDB[i].nombre_tarea} `,
                'Estimation': tareasDB[i].tiempo_tarea,
                'FinishedDate': tareasDB[i].fechaFinalizacion_caso,
                'Iterations': tareasDB[i].iteracion_caso,
                'Status': tareasDB[i].estado_tareaCasoUso,
                'IdTareaCasoUso': tareasDB[i].id_tareaCasoUso,
                'IdCasoUso': tareasDB[i].id_casoUso
            };
            insertAirtable.push(temp);
        }
        i++;
    }


    // console.log('updateAirtable', updateAirtable);
    // console.log('insertAirtable', insertAirtable);
    // console.log('deleteAirtable', Object.keys(tareasAirtable).length, tareasAirtable);
    // console.log('updateDB', updateDB);

    // EJECUTAR CAMBIOS
    let airtableKeys = localStorage.getItem(`airtableKeys_${id_proyecto}`);
    airtableKeys = JSON.parse(airtableKeys);
    if (airtableKeys != null && airtableKeys != undefined) {
        if (Object.keys(updateAirtable).length) {
            postUpdate(id_proyecto, airtableKeys['UserKey'], airtableKeys['BaseKey'], updateAirtable, "update");
        }
        if (insertAirtable.length > 0) {
            postUpdate(id_proyecto, airtableKeys['UserKey'], airtableKeys['BaseKey'], insertAirtable, "create");
        }
        if (Object.keys(tareasAirtable).length > 0 && proyecto_data.iteracionActual == "TODOS"){
            postUpdate(id_proyecto, airtableKeys['UserKey'], airtableKeys['BaseKey'],tareasAirtable, "delete");
        }
        fetchAirtableData(id_proyecto);
        if (updateDB.length > 0) {
            postUpdateDB(id_proyecto, updateDB);
        }
        location.reload();
    } 
    else {
        console.warn('No Airtable keys identified for this project');
        alert('No se han entontrado las llaves de autenticación de Airtable en las Cookies.\nPrueba ingresando a la pesaña de Airtable.');
    }
}


function postUpdate(id_proyecto, userKey_proyecto, baseKey_proyecto, fields, mode) {
    let keys = Object.keys(fields);
    let list = [];
    for (let i = 0; i < keys.length; i++) {
        list.push(fields[keys[i]]);
    }
    const values = {
        'fields': list,
        'userKey': userKey_proyecto,
        'baseKey': baseKey_proyecto,
        'mode': mode
    };
    var csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    fetch(`https://natgas-project-manager.uc.r.appspot.com/proyecto/${id_proyecto}/sync/update_airtable`, {
        method: 'POST',
        body: JSON.stringify(values),
        credentials: "same-origin",
        headers: {
            "Accept": "application/json,",
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrfToken
        }
    })
        .then(response => {
            if (response.ok) {
                return response;
            } else {
                throw "Error en la llamada Ajax";
            }
        })
        .catch(error => console.log(error));
}


function postUpdateDB(id_proyecto, rows) {
    var csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const values = { data: rows }
    fetch(`https://natgas-project-manager.uc.r.appspot.com/proyecto/${id_proyecto}/sync/update_db`, {
        method: 'POST',
        body: JSON.stringify(values),
        headers: {
            "Accept": "application/json,",
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrfToken
        }
    })
        .then(response => {
            if (response.ok) {
                return response;
            } else {
                throw "Error en la llamada Ajax";
            }
        })
        .catch(error => console.log(error));
}
