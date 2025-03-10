import { artemis } from 'src/test/cypress/support/ArtemisTesting';

// The user management object
const users = artemis.users;
const student = users.getStudentOne();
const tutor = users.getTutor();
const admin = users.getAdmin();
const instructor = users.getInstructor();

// Requests
const courseManagement = artemis.requests.courseManagement;

// PageObjects
const coursesPage = artemis.pageobjects.courseManagement;
const courseAssessment = artemis.pageobjects.assessment.course;
const exerciseAssessment = artemis.pageobjects.assessment.exercise;
const textAssessment = artemis.pageobjects.assessment.text;
const exerciseResult = artemis.pageobjects.exerciseResult;
const textFeedback = artemis.pageobjects.textExercise.feedback;

// This is a workaround for uncaught athene errors. When opening a text submission athene throws an uncaught exception, which fails the test
Cypress.on('uncaught:exception', () => {
    return false;
});

describe('Text exercise assessment', () => {
    let course: any;
    let exercise: any;
    const tutorFeedback = 'Try to use some newlines next time!';
    const tutorFeedbackPoints = 4;
    const tutorTextFeedback = 'Nice ending of the sentence!';
    const tutorTextFeedbackPoints = 2;
    const complaint = "That feedback wasn't very useful!";

    before('Creates a text exercise and makes a student submission', () => {
        createCourseWithTextExercise().then(() => {
            makeTextSubmissionAsStudent();
        });
    });

    after(() => {
        if (!!course) {
            cy.login(users.getAdmin());
            courseManagement.deleteCourse(course.id);
        }
    });

    it('Assesses the text exercise submission', () => {
        cy.login(tutor, '/course-management');
        coursesPage.openAssessmentDashboardOfCourseWithId(course.id);
        courseAssessment.checkShowFinishedExercises();
        courseAssessment.clickExerciseDashboardButton();
        exerciseAssessment.clickHaveReadInstructionsButton();
        cy.contains('There are no complaints at the moment').should('be.visible');
        cy.contains('There are no requests at the moment.').should('be.visible');
        exerciseAssessment.clickStartNewAssessment();
        textAssessment.getInstructionsRootElement().contains(exercise.title).should('be.visible');
        textAssessment.getInstructionsRootElement().contains(exercise.problemStatement).should('be.visible');
        textAssessment.getInstructionsRootElement().contains(exercise.sampleSolution).should('be.visible');
        textAssessment.getInstructionsRootElement().contains(exercise.gradingInstructions).should('be.visible');
        cy.contains('Number of words: 100').should('be.visible');
        cy.contains('Number of characters: 591').should('be.visible');
        textAssessment.provideFeedbackOnTextSection('sed diam voluptua', tutorTextFeedbackPoints, tutorTextFeedback);
        textAssessment.addNewFeedback(tutorFeedbackPoints, tutorFeedback);
        textAssessment.submit().its('response.statusCode').should('eq', 200);
    });

    describe('Feedback', () => {
        it('Student sees feedback after assessment due date and complains', () => {
            cy.login(student, `/courses/${course.id}/exercises/${exercise.id}`);
            const totalPoints = tutorFeedbackPoints + tutorTextFeedbackPoints;
            const percentage = totalPoints * 10;
            exerciseResult.shouldShowExerciseTitle(exercise.title);
            exerciseResult.shouldShowProblemStatement(exercise.problemStatement);
            exerciseResult.shouldShowScore(percentage);
            exerciseResult.clickViewSubmission();
            textFeedback.shouldShowTextFeedback(tutorTextFeedback);
            textFeedback.shouldShowAdditionalFeedback(tutorFeedbackPoints, tutorFeedback);
            textFeedback.shouldShowScore(totalPoints, exercise.maxPoints, percentage);
            textFeedback.complain(complaint);
        });

        it('Instructor can see complaint and reject it', () => {
            cy.login(instructor, `/course-management/${course.id}/assessment-dashboard`);
            courseAssessment.openComplaints(course.id);
            textAssessment.acceptComplaint('Makes sense').its('response.statusCode').should('eq', 200);
        });
    });

    function createCourseWithTextExercise() {
        cy.login(admin);
        return courseManagement.createCourse().then((response) => {
            course = response.body;
            courseManagement.addStudentToCourse(course.id, student.username);
            courseManagement.addTutorToCourse(course, tutor);
            courseManagement.addInstructorToCourse(course.id, instructor);
            courseManagement.createTextExercise({ course }).then((textResponse) => {
                exercise = textResponse.body;
            });
        });
    }

    function makeTextSubmissionAsStudent() {
        cy.login(student);
        courseManagement.startExerciseParticipation(course.id, exercise.id);
        cy.fixture('loremIpsum.txt').then((submission) => {
            courseManagement.makeTextExerciseSubmission(exercise.id, submission);
        });
    }
});
