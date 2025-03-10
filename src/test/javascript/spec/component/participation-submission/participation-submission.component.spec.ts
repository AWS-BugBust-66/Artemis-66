import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { JhiLanguageHelper } from 'app/core/language/language.helper';
import { AccountService } from 'app/core/auth/account.service';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import dayjs from 'dayjs';
import { restore, SinonStub, stub } from 'sinon';
import { ArtemisTestModule } from '../../test.module';
import { MockSyncStorage } from '../../helpers/mocks/service/mock-sync-storage.service';
import { MockComponent, MockDirective, MockPipe } from 'ng-mocks';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AssessmentDetailComponent } from 'app/assessment/assessment-detail/assessment-detail.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MockAccountService } from '../../helpers/mocks/service/mock-account.service';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { ComplaintService } from 'app/complaints/complaint.service';
import { ParticipationSubmissionComponent } from 'app/exercises/shared/participation-submission/participation-submission.component';
import { SubmissionService } from 'app/exercises/shared/submission/submission.service';
import { MockComplaintService } from '../../helpers/mocks/service/mock-complaint.service';
import { ComplaintsForTutorComponent } from 'app/complaints/complaints-for-tutor/complaints-for-tutor.component';
import { UpdatingResultComponent } from 'app/exercises/shared/result/updating-result.component';
import { Submission, SubmissionExerciseType, SubmissionType } from 'app/entities/submission.model';
import { StudentParticipation } from 'app/entities/participation/student-participation.model';
import { TextSubmission } from 'app/entities/text-submission.model';
import { RouterTestingModule } from '@angular/router/testing';
import { ExerciseService } from 'app/exercises/shared/exercise/exercise.service';
import { Exercise, ExerciseType } from 'app/entities/exercise.model';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { TemplateProgrammingExerciseParticipation } from 'app/entities/participation/template-programming-exercise-participation.model';
import { ProgrammingSubmission } from 'app/entities/programming-submission.model';
import { ProgrammingExerciseService } from 'app/exercises/programming/manage/services/programming-exercise.service';
import { ProgrammingExercise } from 'app/entities/programming-exercise.model';
import { SolutionProgrammingExerciseParticipation } from 'app/entities/participation/solution-programming-exercise-participation.model';
import { ProfileService } from 'app/shared/layouts/profiles/profile.service';
import { ProfileInfo } from 'app/shared/layouts/profiles/profile-info.model';
import { ParticipationService } from 'app/exercises/shared/participation/participation.service';
import { Participation } from 'app/entities/participation/participation.model';
import { TextAssessmentService } from 'app/exercises/text/assess/text-assessment.service';
import { FileUploadAssessmentService } from 'app/exercises/file-upload/assess/file-upload-assessment.service';
import { ProgrammingAssessmentManualResultService } from 'app/exercises/programming/assess/manual-result/programming-assessment-manual-result.service';
import { ModelingAssessmentService } from 'app/exercises/modeling/assess/modeling-assessment.service';
import { Result } from 'app/entities/result.model';
import { ArtemisTranslatePipe } from 'app/shared/pipes/artemis-translate.pipe';
import { AlertComponent } from 'app/shared/alert/alert.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ArtemisDatePipe } from 'app/shared/pipes/artemis-date.pipe';
import { ResultComponent } from 'app/exercises/shared/result/result.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ArtemisTimeAgoPipe } from 'app/shared/pipes/artemis-time-ago.pipe';
import { DeleteButtonDirective } from 'app/shared/delete-dialog/delete-button.directive';
import { MockTranslateService } from '../../helpers/mocks/service/mock-translate.service';
import { TranslateService } from '@ngx-translate/core';
import { MockTranslateValuesDirective } from '../../helpers/mocks/directive/mock-translate-values.directive';

chai.use(sinonChai);
const expect = chai.expect;

describe('ParticipationSubmissionComponent', () => {
    let comp: ParticipationSubmissionComponent;
    let fixture: ComponentFixture<ParticipationSubmissionComponent>;
    let participationService: ParticipationService;
    let submissionService: SubmissionService;
    let textAssessmentService: TextAssessmentService;
    let fileUploadAssessmentService: FileUploadAssessmentService;
    let programmingAssessmentService: ProgrammingAssessmentManualResultService;
    let modelingAssessmentService: ModelingAssessmentService;
    let deleteFileUploadAssessmentStub: SinonStub;
    let deleteModelingAssessmentStub: SinonStub;
    let deleteTextAssessmentStub: SinonStub;
    let deleteProgrammingAssessmentStub: SinonStub;
    let exerciseService: ExerciseService;
    let programmingExerciseService: ProgrammingExerciseService;
    let profileService: ProfileService;
    let findAllSubmissionsOfParticipationStub: SinonStub;
    let debugElement: DebugElement;
    let router: Router;
    const route = { params: of({ participationId: 1, exerciseId: 42 }) };
    // Template for Bitbucket commit hash url
    const commitHashURLTemplate = 'https://bitbucket.ase.in.tum.de/projects/{projectKey}/repos/{repoSlug}/commits/{commitHash}';

    const result1 = { id: 44 } as Result;
    const result2 = { id: 45 } as Result;
    const participation1 = { id: 66 } as Participation;
    const submissionWithTwoResults = { id: 77, results: [result1, result2], participation: participation1 } as Submission;
    const submissionWithTwoResults2 = { id: 78, results: [result1, result2], participation: participation1 } as Submission;

    const programmingExercise1 = { id: 100, type: ExerciseType.PROGRAMMING } as Exercise;
    const modelingExercise = { id: 100, type: ExerciseType.MODELING } as Exercise;
    const fileUploadExercise = { id: 100, type: ExerciseType.FILE_UPLOAD } as Exercise;
    const textExercise = { id: 100, type: ExerciseType.TEXT } as Exercise;

    beforeEach(() => {
        return TestBed.configureTestingModule({
            imports: [ArtemisTestModule, RouterTestingModule, NgxDatatableModule],
            declarations: [
                ParticipationSubmissionComponent,
                MockComponent(UpdatingResultComponent),
                MockComponent(AssessmentDetailComponent),
                MockComponent(ComplaintsForTutorComponent),
                MockTranslateValuesDirective,
                MockPipe(ArtemisTranslatePipe),
                MockPipe(ArtemisDatePipe),
                MockPipe(ArtemisTimeAgoPipe),
                MockDirective(DeleteButtonDirective),
                MockComponent(AlertComponent),
                MockComponent(ResultComponent),
                MockComponent(FaIconComponent),
            ],
            providers: [
                JhiLanguageHelper,
                { provide: TranslateService, useClass: MockTranslateService },
                { provide: AccountService, useClass: MockAccountService },
                { provide: SessionStorageService, useClass: MockSyncStorage },
                { provide: LocalStorageService, useClass: MockSyncStorage },
                { provide: ComplaintService, useClass: MockComplaintService },
                { provide: ActivatedRoute, useValue: route },
            ],
        })
            .overrideModule(ArtemisTestModule, { set: { declarations: [], exports: [] } })
            .compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(ParticipationSubmissionComponent);
                comp = fixture.componentInstance;
                comp.participationId = 1;
                debugElement = fixture.debugElement;
                router = debugElement.injector.get(Router);
                participationService = TestBed.inject(ParticipationService);
                submissionService = TestBed.inject(SubmissionService);
                textAssessmentService = TestBed.inject(TextAssessmentService);
                modelingAssessmentService = TestBed.inject(ModelingAssessmentService);
                programmingAssessmentService = TestBed.inject(ProgrammingAssessmentManualResultService);
                fileUploadAssessmentService = TestBed.inject(FileUploadAssessmentService);

                exerciseService = fixture.debugElement.injector.get(ExerciseService);
                programmingExerciseService = fixture.debugElement.injector.get(ProgrammingExerciseService);
                profileService = fixture.debugElement.injector.get(ProfileService);
                findAllSubmissionsOfParticipationStub = stub(submissionService, 'findAllSubmissionsOfParticipation');

                deleteFileUploadAssessmentStub = stub(fileUploadAssessmentService, 'deleteAssessment');
                deleteProgrammingAssessmentStub = stub(programmingAssessmentService, 'deleteAssessment');
                deleteModelingAssessmentStub = stub(modelingAssessmentService, 'deleteAssessment');
                deleteTextAssessmentStub = stub(textAssessmentService, 'deleteAssessment');
                // Set profile info
                const profileInfo = new ProfileInfo();
                profileInfo.commitHashURLTemplate = commitHashURLTemplate;
                stub(profileService, 'getProfileInfo').returns(new BehaviorSubject(profileInfo));
                fixture.ngZone!.run(() => router.initialNavigation());
            });
    });

    afterEach(() => {
        restore();
    });

    it('Submissions are correctly loaded from server', fakeAsync(() => {
        // set all attributes for comp
        const participation = new StudentParticipation();
        participation.id = 1;
        stub(participationService, 'find').returns(of(new HttpResponse({ body: participation })));
        const submissions = [
            {
                submissionExerciseType: SubmissionExerciseType.TEXT,
                id: 2278,
                submitted: true,
                type: SubmissionType.MANUAL,
                submissionDate: dayjs('2019-07-09T10:47:33.244Z'),
                text: 'My TextSubmission',
                participation,
            },
        ] as TextSubmission[];
        const exercise = { type: ExerciseType.TEXT } as Exercise;
        exercise.isAtLeastInstructor = true;
        stub(exerciseService, 'find').returns(of(new HttpResponse({ body: exercise })));
        findAllSubmissionsOfParticipationStub.returns(of({ body: submissions }));

        fixture.detectChanges();
        tick();

        expect(comp.isLoading).to.be.false;
        // check if findAllSubmissionsOfParticipationStub() is called and works
        expect(findAllSubmissionsOfParticipationStub).to.have.been.called;
        expect(comp.participation).to.be.deep.equal(participation);
        expect(comp.submissions).to.be.deep.equal(submissions);

        // check if delete button is available
        const deleteButton = debugElement.query(By.css('#deleteButton'));
        expect(deleteButton).to.exist;

        // check if the right amount of rows is visible
        const row = debugElement.query(By.css('#participationSubmissionTable'));
        expect(row.childNodes.length).to.equal(1);

        fixture.destroy();
        flush();
    }));

    it('Template Submission is correctly loaded', fakeAsync(() => {
        TestBed.get(ActivatedRoute).params = of({ participationId: 2, exerciseId: 42 });
        TestBed.get(ActivatedRoute).queryParams = of({ isTmpOrSolutionProgrParticipation: 'true' });
        const templateParticipation = new TemplateProgrammingExerciseParticipation();
        templateParticipation.id = 2;
        templateParticipation.submissions = [
            {
                submissionExerciseType: SubmissionExerciseType.PROGRAMMING,
                id: 3,
                submitted: true,
                type: SubmissionType.MANUAL,
                submissionDate: dayjs('2019-07-09T10:47:33.244Z'),
                commitHash: '123456789',
                participation: templateParticipation,
            },
        ] as ProgrammingSubmission[];
        const programmingExercise = { type: ExerciseType.PROGRAMMING, projectKey: 'SUBMISSION1', templateParticipation } as ProgrammingExercise;
        const findWithTemplateAndSolutionParticipationStub = stub(programmingExerciseService, 'findWithTemplateAndSolutionParticipation');
        findWithTemplateAndSolutionParticipationStub.returns(of(new HttpResponse({ body: programmingExercise })));

        fixture.detectChanges();
        tick();

        expect(comp.isLoading).to.be.false;
        expect(findWithTemplateAndSolutionParticipationStub).to.have.been.called;
        expect(comp.exercise).to.be.deep.equal(programmingExercise);
        expect(comp.participation).to.be.deep.equal(templateParticipation);
        expect(comp.submissions).to.be.deep.equal(templateParticipation.submissions);

        // Create correct url for commit hash
        const submission = templateParticipation.submissions[0] as ProgrammingSubmission;
        checkForCorrectCommitHashUrl(submission, programmingExercise, '-exercise');

        fixture.destroy();
        flush();
    }));

    it('Solution Submission is correctly loaded', fakeAsync(() => {
        TestBed.get(ActivatedRoute).params = of({ participationId: 3, exerciseId: 42 });
        TestBed.get(ActivatedRoute).queryParams = of({ isTmpOrSolutionProgrParticipation: 'true' });
        const solutionParticipation = new SolutionProgrammingExerciseParticipation();
        solutionParticipation.id = 3;
        solutionParticipation.submissions = [
            {
                submissionExerciseType: SubmissionExerciseType.PROGRAMMING,
                id: 4,
                submitted: true,
                type: SubmissionType.MANUAL,
                submissionDate: dayjs('2019-07-09T10:47:33.244Z'),
                commitHash: '123456789',
                participation: solutionParticipation,
            },
        ] as ProgrammingSubmission[];
        const programmingExercise = { type: ExerciseType.PROGRAMMING, projectKey: 'SUBMISSION1', solutionParticipation } as ProgrammingExercise;
        const findWithTemplateAndSolutionParticipationStub = stub(programmingExerciseService, 'findWithTemplateAndSolutionParticipation');
        findWithTemplateAndSolutionParticipationStub.returns(of(new HttpResponse({ body: programmingExercise })));

        fixture.detectChanges();
        tick();

        expect(comp.isLoading).to.be.false;
        expect(findWithTemplateAndSolutionParticipationStub).to.have.been.called;
        expect(comp.participation).to.be.deep.equal(solutionParticipation);
        expect(comp.submissions).to.be.deep.equal(solutionParticipation.submissions);

        // Create correct url for commit hash
        const submission = solutionParticipation.submissions[0] as ProgrammingSubmission;
        checkForCorrectCommitHashUrl(submission, programmingExercise, '-solution');

        fixture.destroy();
        flush();
    }));

    describe('should delete', () => {
        beforeEach(() => {
            deleteFileUploadAssessmentStub.returns(of({}));
            deleteTextAssessmentStub.returns(of({}));
            deleteModelingAssessmentStub.returns(of({}));
            deleteProgrammingAssessmentStub.returns(of({}));
            findAllSubmissionsOfParticipationStub.returns(of({ body: [submissionWithTwoResults] }));
            stub(participationService, 'find').returns(of(new HttpResponse({ body: participation1 })));
        });

        afterEach(() => {
            expect(comp.submissions?.length).to.be.equal(1);
            expect(comp.submissions![0].results?.length).to.be.equal(1);
            expect(comp.submissions![0].results![0]).to.be.deep.equal(result1);
        });

        it('should delete result of fileUploadSubmission', fakeAsync(() => {
            stub(exerciseService, 'find').returns(of(new HttpResponse({ body: fileUploadExercise })));
            deleteResult(submissionWithTwoResults, result2);
            flush();
        }));

        it('should delete result of modelingSubmission', fakeAsync(() => {
            stub(exerciseService, 'find').returns(of(new HttpResponse({ body: modelingExercise })));
            deleteResult(submissionWithTwoResults, result2);
            flush();
        }));

        it('should delete result of programmingSubmission', fakeAsync(() => {
            stub(exerciseService, 'find').returns(of(new HttpResponse({ body: programmingExercise1 })));
            deleteResult(submissionWithTwoResults, result2);
            flush();
        }));

        it('should delete result of textSubmission', fakeAsync(() => {
            stub(exerciseService, 'find').returns(of(new HttpResponse({ body: textExercise })));
            fixture.detectChanges();
            tick();
            expect(findAllSubmissionsOfParticipationStub).to.have.been.called;
            expect(comp.submissions![0].results![0].submission).to.be.deep.equal(submissionWithTwoResults);
            comp.deleteResult(submissionWithTwoResults, result2);
            tick();
            fixture.destroy();
            flush();
        }));
    });

    describe('should handle failed delete', () => {
        beforeEach(() => {
            const error = { message: '400 error', error: { message: 'error.hasComplaint' } } as HttpErrorResponse;
            deleteFileUploadAssessmentStub.returns(throwError(error));
            deleteProgrammingAssessmentStub.returns(throwError(error));
            deleteModelingAssessmentStub.returns(throwError(error));
            deleteTextAssessmentStub.returns(throwError(error));
            findAllSubmissionsOfParticipationStub.returns(of({ body: [submissionWithTwoResults2] }));
            stub(participationService, 'find').returns(of(new HttpResponse({ body: participation1 })));
        });

        afterEach(() => {
            expect(comp.submissions?.length).to.be.equal(1);
            expect(comp.submissions![0].results?.length).to.be.equal(2);
            expect(comp.submissions![0].results![0]).to.be.deep.equal(result1);
        });

        it('should not delete result of fileUploadSubmission because of server error', fakeAsync(() => {
            const error2 = { message: '403 error', error: { message: 'error.badAuthentication' } } as HttpErrorResponse;
            deleteFileUploadAssessmentStub.returns(throwError(error2));
            stub(exerciseService, 'find').returns(of(new HttpResponse({ body: fileUploadExercise })));
            deleteResult(submissionWithTwoResults, result2);
            flush();
        }));

        it('should not delete result of fileUploadSubmission', fakeAsync(() => {
            stub(exerciseService, 'find').returns(of(new HttpResponse({ body: fileUploadExercise })));
            deleteResult(submissionWithTwoResults, result2);
            flush();
        }));

        it('should not delete result of modelingSubmission', fakeAsync(() => {
            stub(exerciseService, 'find').returns(of(new HttpResponse({ body: modelingExercise })));
            deleteResult(submissionWithTwoResults, result2);
            flush();
        }));

        it('should not delete result of programmingSubmission', fakeAsync(() => {
            stub(exerciseService, 'find').returns(of(new HttpResponse({ body: programmingExercise1 })));
            deleteResult(submissionWithTwoResults, result2);
            flush();
        }));

        it('should not delete result of textSubmission', fakeAsync(() => {
            stub(exerciseService, 'find').returns(of(new HttpResponse({ body: textExercise })));
            fixture.detectChanges();
            tick();
            expect(findAllSubmissionsOfParticipationStub).to.have.been.called;
            expect(comp.submissions![0].results![0].submission).to.be.deep.equal(submissionWithTwoResults2);
            comp.deleteResult(submissionWithTwoResults, result2);
            tick();
            fixture.destroy();
            flush();
        }));
    });

    function checkForCorrectCommitHashUrl(submission: ProgrammingSubmission, programmingExercise: ProgrammingExercise, repoSlug: string) {
        const projectKey = programmingExercise.projectKey!.toLowerCase();
        const receivedCommitHashUrl = comp.getCommitUrl(submission);
        const commitHashUrl = commitHashURLTemplate
            .replace('{projectKey}', projectKey)
            .replace('{repoSlug}', projectKey + repoSlug)
            .replace('{commitHash}', submission.commitHash!);
        expect(receivedCommitHashUrl).to.equal(commitHashUrl);
    }

    function deleteResult(submission: Submission, resultToDelete: Result) {
        fixture.detectChanges();
        tick();
        comp.deleteResult(submission, resultToDelete);
        tick();
        fixture.destroy();
    }
});
