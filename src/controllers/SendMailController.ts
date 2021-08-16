import {Request, Response} from "express";
import { getCustomRepository } from "typeorm";
import { SurveysRepository } from "../repositories/SurveysRepository";
import { SurveysUsersRepository } from "../repositories/SurveysUsersRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import SendMailService from "../services/SendMailService";
import { resolve } from 'path'

class SendMailController {
    async execute(request: Request, response: Response){
        const { email, survey_id} = request.body;

        const usersRepository = getCustomRepository(UsersRepository);
        const surveysRepository = getCustomRepository(SurveysRepository);
        const surveysUsersRepository = getCustomRepository(SurveysUsersRepository);

        const userAlreadyExists = await usersRepository.findOne({email});

        if (!userAlreadyExists) {
            return response.status(400).json({
                error: "User does not exists",
            });
        };

        const surveysAlreadyExists = await surveysRepository.findOne({id: survey_id});

        if (!surveysAlreadyExists) {
            return response.status(400).json({
                error: "Survey does not exists !"
            })
        };

        const surveyUser = surveysUsersRepository.create({
            user_id: userAlreadyExists.id,
            survey_id,
        });

        await surveysUsersRepository.save(surveyUser);

        const npsPath = resolve(__dirname, "..", "views", "emails", "npsMail.hbs");

        const variables = {
            name: userAlreadyExists.name,
            title: surveysAlreadyExists.title,
            description: surveysAlreadyExists.description,
            user_id: userAlreadyExists.id,
            link: process.env.URL_MAIL,
        }

        const surveysUsersAlreadyExists = await surveysUsersRepository.findOne({
            where: [{user_id: userAlreadyExists.id}, {value: null}],
            relations: ["user", "survey"]
        });

        if (surveysUsersAlreadyExists){
            await SendMailService.execute(email, surveysAlreadyExists.title, variables, npsPath);
            return response.json(surveysUsersAlreadyExists);
        }

        await SendMailService.execute(email, surveysAlreadyExists.title, variables, npsPath);

        return response.json(surveyUser);
    }
}

export { SendMailController }