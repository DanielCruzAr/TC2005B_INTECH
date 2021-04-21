const express = require('express');
const contextInit = require('../utils/context_manager');
const router = express.Router();
const path = require('path');
const models = require('../models/proyectos');
const { response } = require('express');
router.use(express.static(path.join(__dirname, 'public')));



// GENERAL
exports.getProyectoX = async (request, response, next) => {
	let context = await contextInit('Proyecto ' + request.params.id_proyecto, request);
	let proyecto = await models.fetchProyecto(request.params.id_proyecto);
	proyecto = proyecto[0][0];

	const usuarios = await models.fetchTodosUsuarios();
	const integrantes = await models.fetchIntegrantesProyecto(proyecto.id_proyecto);
	let usuariosIntegrantes = [];

	for (let i = 0; i < integrantes[0].length; i++) {
		usuariosIntegrantes.push(integrantes[0][i].email_usuario);
	}
	
	let tareasCompl = await models.fetchTareasCompletadasProyecto(proyecto.id_proyecto);
	let tareasTotales = await models.fetchNumTareasProyecto(proyecto.id_proyecto);
	let tiempoEstim = await models.fetchTiempoEsProyecto(proyecto.id_proyecto);

	tareasCompl = (tareasCompl[0].length == 0) ? 0 : tareasCompl[0].length;
	tareasTotales = (tareasTotales[0][0]['todas_tareas'] == null) ? 0 : tareasTotales[0][0]['todas_tareas'];
	tiempoEstim = (tiempoEstim[0][0]['tiempo_estimado'] == null) ? 0 : tiempoEstim[0][0]['tiempo_estimado'].toFixed(2);
	
	context['proyecto'] = proyecto;
	context['tareasCompletadas'] = tareasCompl;
	context['tareasTotales'] = tareasTotales;
	context['fechaInicio'] = proyecto.fechaInicio_proyecto;
	context['cliente'] = proyecto.cliente_proyecto;
	context['integrantes'] = integrantes[0];
	context['descripcion'] = proyecto.descripcion_proyecto;
	context['usuariosIntegrantes'] = usuariosIntegrantes;
	context.usuario = usuarios[0];

	response.render('Proyecto1', context);
};

exports.postEditarProyecto = async (request, response, next) => {
	const id_proyecto = request.params.id_proyecto;
	const nombreProyecto = request.body.nombreProyecto;
    const descripcionProyecto = request.body.descripcionProyecto;
    const clienteProyecto = request.body.clienteProyecto;
	
	const integrantes = await models.fetchIntegrantesProyecto(id_proyecto);
	let integrantesActuales = [];
	for (let i = 0; i < integrantes[0].length; i++) {
		integrantesActuales.push(integrantes[0][i].email_usuario);
	}

    let integrantesNuevos = {};
    for (let key in request.body) {
        if (key.includes('id_usuario')) {
			integrantesNuevos[request.body[key]] = request.body[key];
        }
    }

	//integrantesNuevos.includes()

	if (JSON.stringify(integrantesActuales) == JSON.stringify(integrantesNuevos) ) {
		console.log("entre al if")
		integrantesActuales.forEach(user => {
			models.deleteIntegrante(id_proyecto, user).catch(error => console.log(error));
		});
		integrantesNuevos.forEach(integrante => {
			models.saveUserProyecto(id_proyecto, integrante).catch(error => console.log(error));
		});
	}

    await models.editProyecto(nombreProyecto, clienteProyecto, descripcionProyecto, id_proyecto);

    response.redirect('/proyecto/' + id_proyecto);

}